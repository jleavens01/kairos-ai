// Gemini 2.5 Flash Image Edit 모델을 사용한 이미지 생성/편집
import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

export const generateImage = async ({
  prompt,
  referenceImages = [],
  imageSize = '1:1',
  style,
  projectId,
  sceneNumber,
  user,
  supabaseAdmin,
  metadata = {}
}) => {
  console.log('Generating Gemini 2.5 Flash Edit image with params:', {
    prompt,
    imageCount: referenceImages?.length || 0,
    imageSize,
    style: style?.name || 'none',
    projectId,
    sceneNumber
  });

  // Gemini Edit은 정확히 2개의 참조 이미지가 필요
  if (!referenceImages || referenceImages.length !== 2) {
    throw new Error('Gemini 2.5 Flash Edit 모델은 정확히 2개의 참조 이미지가 필요합니다.');
  }

  // 참조 이미지 URL 추출
  const imageUrls = referenceImages.map(img => {
    // 다양한 형식의 이미지 URL 처리
    if (typeof img === 'string') return img;
    if (img.url) return img.url;
    if (img.storage_image_url) return img.storage_image_url;
    if (img.result_image_url) return img.result_image_url;
    throw new Error('유효한 이미지 URL을 찾을 수 없습니다.');
  });

  console.log('Image URLs:', imageUrls);

  // 스타일이 있는 경우 프롬프트에 추가
  let finalPrompt = prompt;
  if (style && style.prompt_suffix) {
    finalPrompt = `${prompt}, ${style.prompt_suffix}`;
  }

  // 이미지 크기를 픽셀로 변환 (FAL AI 형식)
  const imageSizeMap = {
    '21:9': { width: 1680, height: 720 },
    '16:9': { width: 1280, height: 720 },
    '4:3': { width: 1024, height: 768 },
    '3:2': { width: 1080, height: 720 },
    '1:1': { width: 1024, height: 1024 },
    '2:3': { width: 720, height: 1080 },
    '3:4': { width: 768, height: 1024 },
    '9:16': { width: 720, height: 1280 },
    '9:21': { width: 720, height: 1680 }
  };

  const dimensions = imageSizeMap[imageSize] || { width: 1024, height: 1024 };

  let dbImage; // 변수를 try 블록 외부에 선언
  
  try {
    // 1. gen_images 테이블에 초기 레코드 생성
    const imageRecord = {
      project_id: projectId,
      scene_number: sceneNumber,
      element_name: prompt.substring(0, 100),
      element_type: 'generated',
      image_type: 'generated',
      generation_model: 'gemini-25-flash-edit',
      generation_prompt: finalPrompt,
      generation_status: 'pending',
      resolution: `${dimensions.width}x${dimensions.height}`,
      style: style?.name || null,
      style_id: style?.id || null,
      metadata: {
        ...metadata,
        aspect_ratio: imageSize,
        reference_images: imageUrls,
        reference_count: 2,
        model_version: '2.5-flash'
      },
      created_by: user.sub
    };

    const { data: createdImage, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert([imageRecord])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw new Error('이미지 레코드 생성 실패');
    }
    
    dbImage = createdImage; // 외부 변수에 할당
    console.log('Created image record:', dbImage.id);

    // 2. FAL AI로 이미지 생성 요청
    const falParams = {
      prompt: finalPrompt,
      image_urls: imageUrls,
      num_images: 1
    };

    console.log('Submitting to FAL AI Gemini 2.5 Flash Edit:', falParams);

    // 개발 환경 확인
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));

    let requestId;
    
    if (!isDevelopment) {
      // 프로덕션: 웹훅 사용
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app';
      const { request_id } = await fal.queue.submit('fal-ai/gemini-25-flash-image/edit', {
        input: falParams,
        webhookUrl: `${baseUrl}/.netlify/functions/fal-webhook-handler`
      });
      requestId = request_id;
      console.log('Image generation submitted with webhook:', requestId);
    } else {
      // 개발: 폴링 사용
      const { request_id } = await fal.queue.submit('fal-ai/gemini-25-flash-image/edit', {
        input: falParams
      });
      requestId = request_id;
      console.log('Image generation submitted for polling:', requestId);
    }

    // 3. request_id로 DB 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('gen_images')
      .update({
        request_id: requestId,
        generation_status: 'processing',
        metadata: {
          ...dbImage.metadata,
          fal_request_id: requestId,
          submitted_at: new Date().toISOString()
        }
      })
      .eq('id', dbImage.id);

    if (updateError) {
      console.error('Failed to update request_id:', updateError);
    }

    // 4. 개발 환경에서 폴링 시작 (선택적)
    if (isDevelopment) {
      // 비동기로 폴링 시작 (응답은 즉시 반환)
      pollImageStatus(dbImage.id, requestId);
    }

    return {
      success: true,
      data: {
        ...dbImage,
        request_id: requestId,
        status: 'processing',
        message: 'Gemini 2.5 Flash Edit 이미지 생성이 시작되었습니다.'
      }
    };

  } catch (error) {
    console.error('Gemini Edit image generation error:', error);
    
    // DB에 실패 상태 기록
    if (dbImage?.id) {
      await supabaseAdmin
        .from('gen_images')
        .update({
          generation_status: 'failed',
          error_message: error.message || 'Unknown error'
        })
        .eq('id', dbImage.id);
    }
    
    throw error;
  }
};

// 개발 환경용 폴링 함수
async function pollImageStatus(imageId, requestId) {
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const maxAttempts = 60; // 최대 60번 시도 (5분)
  const pollInterval = 5000; // 5초마다

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const status = await fal.queue.status('fal-ai/gemini-25-flash-image/edit', {
        requestId: requestId,
        logs: true
      });

      console.log(`Gemini Edit status (attempt ${attempt + 1}):`, status.status);

      if (status.status === 'COMPLETED') {
        // 결과 가져오기
        const result = await fal.queue.result('fal-ai/gemini-25-flash-image/edit', {
          requestId: requestId
        });

        console.log('Gemini Edit completed:', result);

        // 이미지 URL 추출
        const imageUrl = result.data?.images?.[0]?.url || 
                        result.images?.[0]?.url ||
                        result.image?.url ||
                        result.url;
        
        const description = result.data?.description || 
                          result.description || 
                          '';

        if (!imageUrl) {
          throw new Error('No image URL in result');
        }

        // DB 업데이트
        // 현재 메타데이터 가져오기
        const { data: currentImage } = await supabaseAdmin
          .from('gen_images')
          .select('metadata')
          .eq('id', imageId)
          .single();
        
        const { error: updateError } = await supabaseAdmin
          .from('gen_images')
          .update({
            generation_status: 'completed',
            result_image_url: imageUrl,
            storage_image_url: imageUrl,
            metadata: {
              ...currentImage?.metadata,
              completion_response: result.data || result,
              processing_time: attempt * pollInterval,
              gemini_description: description
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }

        console.log('Gemini Edit image saved successfully for ID:', imageId);
        return;
      } else if (status.status === 'FAILED' || status.status === 'ERROR') {
        // 실패 처리
        await supabaseAdmin
          .from('gen_images')
          .update({
            generation_status: 'failed',
            error_message: status.error || 'Generation failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId);

        console.error('Gemini Edit failed:', status);
        return;
      }
    } catch (error) {
      console.error('Polling error:', error);
      
      // 마지막 시도에서 에러 발생 시 실패로 처리
      if (attempt === maxAttempts - 1) {
        await supabaseAdmin
          .from('gen_images')
          .update({
            generation_status: 'failed',
            error_message: 'Polling timeout',
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId);
      }
    }
  }
}