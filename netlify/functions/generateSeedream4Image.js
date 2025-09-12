// ByteDance Seedream 4.0 Edit 모델을 사용한 이미지 편집
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
  sceneId,
  sceneName,
  category = 'scene',
  elementName,
  user,
  supabaseAdmin,
  metadata = {}
}) => {
  console.log('Generating Seedream 4.0 Edit image with params:', {
    prompt,
    imageCount: referenceImages?.length || 0,
    imageSize,
    style: style?.name || 'none',
    projectId,
    sceneNumber
  });

  // Seedream 4.0 Edit는 최소 1개의 참조 이미지 필요
  if (!referenceImages || referenceImages.length < 1) {
    throw new Error('Seedream 4.0 Edit 모델은 최소 1개의 참조 이미지가 필요합니다.');
  }

  // 최대 5개 이미지만 지원
  if (referenceImages.length > 5) {
    throw new Error('Seedream 4.0 Edit 모델은 최대 5개의 참조 이미지만 지원합니다.');
  }

  // 참조 이미지 URL 추출
  const imageUrls = referenceImages.map(img => {
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

  // 이미지 크기를 FAL AI 형식으로 변환
  let falImageSize;
  
  // 새로운 Seedream 4.0 형식이 직접 전달된 경우
  if (imageSize.includes('square') || imageSize.includes('portrait') || imageSize.includes('landscape')) {
    // FAL AI enum 값을 직접 사용
    falImageSize = imageSize;
  } else if (imageSize.startsWith('custom_')) {
    // 커스텀 크기 처리 (custom_1280_720 → {width: 1280, height: 720})
    const [, width, height] = imageSize.split('_');
    falImageSize = {
      width: parseInt(width),
      height: parseInt(height)
    };
  } else {
    // 기존 비율 형식 지원 (하위 호환성)
    const imageSizeMap = {
      '1:1': 'square_hd',
      '4:3': 'landscape_4_3', 
      '3:4': 'portrait_4_3',
      '16:9': 'landscape_16_9',
      '9:16': 'portrait_16_9',
      '21:9': { width: 1680, height: 720 },
      '3:2': { width: 1080, height: 720 },
      '2:3': { width: 720, height: 1080 },
      '9:21': { width: 720, height: 1680 }
    };
    falImageSize = imageSizeMap[imageSize] || 'square_hd';
  }

  let dbImage;
  
  try {
    // element_name 결정 로직
    let finalElementName = elementName;
    if (!finalElementName) {
      if (category === 'scene' && sceneName) {
        finalElementName = sceneName;
      } else if (category === 'scene' && sceneNumber) {
        finalElementName = `씬 ${sceneNumber}`;
      } else if (category === 'character' || category === 'background' || category === 'object') {
        finalElementName = prompt.split(',')[0].substring(0, 50);
      } else {
        finalElementName = prompt.substring(0, 50);
      }
    }
    
    // 1. gen_images 테이블에 초기 레코드 생성
    const imageRecord = {
      project_id: projectId,
      production_sheet_id: sceneId || sceneNumber,
      scene_number: sceneNumber || null,
      element_name: finalElementName,
      image_type: category || 'scene',
      generation_model: 'seedream-4-edit',
      prompt_used: finalPrompt,
      custom_prompt: prompt,
      generation_status: 'pending',
      reference_image_url: imageUrls[0] || null,
      style_id: style?.id || null,
      style_name: style?.name || null,
      metadata: {
        ...metadata,
        aspect_ratio: imageSize,
        reference_images: imageUrls,
        reference_count: imageUrls.length,
        model_version: '4.0-edit',
        created_by: user.sub
      },
      credits_cost: getCreditCost(),
      tags: []
    };

    const { data: createdImage, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert([imageRecord])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw new Error(`이미지 레코드 생성 실패: ${dbError.message}`);
    }
    
    dbImage = createdImage;
    console.log('Created image record:', dbImage.id);

    // 2. FAL AI로 이미지 편집 요청
    const falParams = {
      prompt: finalPrompt,
      image_urls: imageUrls,
      image_size: falImageSize,
      num_images: 1,
      max_images: 1,
      enable_safety_checker: true
    };

    console.log('Submitting to FAL AI Seedream 4.0 Edit:', falParams);

    // 개발 환경 확인
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));

    let requestId;
    
    if (!isDevelopment) {
      // 프로덕션: 웹훅 사용
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app';
      const submitResult = await fal.queue.submit('fal-ai/bytedance/seedream/v4/edit', {
        input: falParams,
        webhookUrl: `${baseUrl}/.netlify/functions/fal-webhook-handler`
      });
      requestId = submitResult.request_id;
      console.log('Image generation submitted with webhook:', requestId);
    } else {
      // 개발: 폴링 사용
      const submitResult = await fal.queue.submit('fal-ai/bytedance/seedream/v4/edit', {
        input: falParams
      });
      requestId = submitResult.request_id;
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
      pollImageStatus(dbImage.id, requestId);
    }

    return {
      success: true,
      data: {
        ...dbImage,
        request_id: requestId,
        status: 'processing',
        message: 'Seedream 4.0 Edit 이미지 편집이 시작되었습니다.'
      }
    };

  } catch (error) {
    console.error('Seedream 4.0 Edit image generation error:', error);
    
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
      const status = await fal.queue.status('fal-ai/bytedance/seedream/v4/edit', {
        requestId: requestId,
        logs: true
      });

      console.log(`Seedream 4.0 Edit status (attempt ${attempt + 1}):`, status.status);

      if (status.status === 'COMPLETED') {
        const result = await fal.queue.result('fal-ai/bytedance/seedream/v4/edit', {
          requestId: requestId
        });

        console.log('Seedream 4.0 Edit completed:', result);

        // 이미지 URL 추출
        const imageUrl = result.data?.images?.[0]?.url || 
                        result.images?.[0]?.url ||
                        result.image?.url ||
                        result.url;

        if (!imageUrl) {
          throw new Error('No image URL in result');
        }

        // DB 업데이트
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
            
            metadata: {
              ...currentImage?.metadata,
              completion_response: result.data || result,
              processing_time: attempt * pollInterval,
              seed: result.data?.seed
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }

        console.log('Seedream 4.0 Edit image saved successfully for ID:', imageId);
        return;
      } else if (status.status === 'FAILED' || status.status === 'ERROR') {
        await supabaseAdmin
          .from('gen_images')
          .update({
            generation_status: 'failed',
            error_message: status.error || 'Generation failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId);

        console.error('Seedream 4.0 Edit failed:', status);
        return;
      }
    } catch (error) {
      console.error('Polling error:', error);
      
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

// 크레딧 비용 계산
function getCreditCost() {
  // Seedream 4.0 Edit 크레딧 비용 (실제 비용 기준 조정)
  return 50; // $0.50 → 50 크레딧
}