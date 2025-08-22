// GPT-Image-1 모델 이미지 생성 함수 (웹훅 방식)
import { fal } from "@fal-ai/client";

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

export async function generateImage({
  projectId,
  prompt,
  imageSize = '1024x1024',
  category = 'scene',
  characterName,
  parameters = {},
  referenceImages = [],
  sceneId = null,
  styleId = null,
  user,
  supabaseAdmin
}) {
  try {
    console.log('GPT Image generation request:', {
      projectId,
      prompt: prompt || 'NO PROMPT PROVIDED',
      promptLength: prompt ? prompt.length : 0,
      imageSize,
      category,
      hasReferenceImages: referenceImages.length > 0
    });

    // 1. DB에 pending 상태로 기록 생성
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert({
        project_id: projectId,
        production_sheet_id: sceneId,
        image_type: category,
        element_name: characterName || prompt.substring(0, 100),
        generation_status: 'pending',
        prompt_used: prompt,
        custom_prompt: prompt,
        generation_model: 'gpt-image-1',
        model_parameters: parameters,
        reference_image_url: referenceImages[0] || null,
        style_id: styleId,
        metadata: {
          width: imageSize.includes('x') ? parseInt(imageSize.split('x')[0]) : null,
          height: imageSize.includes('x') ? parseInt(imageSize.split('x')[1]) : null,
          reference_images: referenceImages,
          created_by: user.sub,
          image_size: imageSize,
          style_id: styleId
        },
        tags: category === 'character' && characterName ? [characterName] : []
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw new Error('Failed to create image record.');
    }

    // 2. FAL AI API 호출 (웹훅 방식)
    let apiEndpoint;
    let requestBody;

    if (referenceImages.length > 0) {
      // 참조 이미지가 있을 때 - Edit Image API
      apiEndpoint = "fal-ai/gpt-image-1/edit-image/byok";
      requestBody = {
        image_urls: referenceImages,
        prompt: prompt,
        size: imageSize,
        num_images: 1,
        openai_api_key: process.env.OPENAI_API_KEY
      };
    } else {
      // 참조 이미지가 없을 때 - Text to Image API
      apiEndpoint = "fal-ai/gpt-image-1/text-to-image/byok";
      requestBody = {
        prompt: prompt,
        size: imageSize,
        num_images: 1,
        openai_api_key: process.env.OPENAI_API_KEY
      };
    }

    console.log('Submitting to FAL AI:', {
      endpoint: apiEndpoint,
      requestBody: {
        ...requestBody,
        prompt: requestBody.prompt ? `${requestBody.prompt.substring(0, 100)}...` : 'NO PROMPT',
        fullPromptLength: requestBody.prompt ? requestBody.prompt.length : 0
      }
    });

    // 개발 환경 여부 확인 (Netlify 환경 변수 체크)
    // CONTEXT는 'production', 'deploy-preview', 'branch-deploy', 'dev' 중 하나
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));
    
    // FAL AI 큐에 제출
    const submitOptions = {
      input: requestBody
    };
    
    // 프로덕션 환경에서만 웹훅 사용
    if (!isDevelopment) {
      // Netlify 배포 URL 사용
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai.netlify.app';
      submitOptions.webhookUrl = `${baseUrl}/.netlify/functions/fal-webhook-handler`;
      console.log('Using webhook for production environment:', submitOptions.webhookUrl);
    } else {
      console.log('Using polling for development environment');
    }
    
    const { request_id } = await fal.queue.submit(apiEndpoint, submitOptions);

    console.log('GPT Image generation submitted:', request_id);

    // 3. DB에 request_id 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('gen_images')
      .update({
        request_id: request_id,
        generation_status: 'processing'
      })
      .eq('id', imageRecord.id);

    if (updateError) {
      console.error('Failed to update request_id:', updateError);
    }

    // 4. 개발 환경과 프로덕션 모두 즉시 응답 반환
    // 개발 환경에서도 비동기 처리로 변경 (타임아웃 문제 해결)
    console.log(`GPT Image generation initiated in ${isDevelopment ? 'development' : 'production'} mode`);
    
    return {
      success: true,
      data: {
        ...imageRecord,
        request_id: request_id,
        status: 'processing',
        message: '이미지 생성이 시작되었습니다. 완료되면 자동으로 갤러리에 표시됩니다.'
      }
    };

  } catch (error) {
    console.error('GPT Image generation error:', error);
    
    // DB에 실패 상태 기록
    if (imageRecord?.id) {
      await supabaseAdmin
        .from('gen_images')
        .update({
          generation_status: 'failed',
          error_message: error.message || 'Generation failed'
        })
        .eq('id', imageRecord.id);
    }

    throw error;
  }
}