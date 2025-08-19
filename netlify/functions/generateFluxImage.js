// Flux 모델 이미지 생성 함수 (웹훅 방식)
import { fal } from "@fal-ai/client";

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

export async function generateImage({
  projectId,
  prompt,
  model = 'flux-schnell',
  imageSize = '16:9',
  category = 'scene',
  characterName,
  parameters = {},
  referenceImages = [],
  sceneId = null,
  styleId = null,
  styleName = null,
  user,
  supabaseAdmin
}) {
  try {
    console.log('Flux Image generation request:', {
      projectId,
      model,
      imageSize,
      category,
      hasReferenceImages: referenceImages.length > 0,
      styleName
    });

    // 스타일이 있으면 프롬프트에 추가
    let finalPrompt = prompt;
    if (styleName) {
      finalPrompt = `${prompt}, ${styleName} style`;
    }

    // 1. DB에 pending 상태로 기록 생성
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert({
        project_id: projectId,
        production_sheet_id: sceneId,
        image_type: category,
        element_name: characterName || prompt.substring(0, 100),
        generation_status: 'pending',
        prompt_used: finalPrompt,
        custom_prompt: prompt,
        generation_model: model,
        model_parameters: parameters,
        reference_image_url: referenceImages[0] || null,
        style_id: styleId,
        style_name: styleName,
        metadata: {
          aspect_ratio: imageSize,
          reference_images: referenceImages,
          created_by: user.sub,
          style_id: styleId,
          style_name: styleName
        },
        tags: category === 'character' && characterName ? [characterName] : []
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw new Error('Failed to create image record.');
    }

    // imageSize를 aspect_ratio 형식으로 변환하는 함수
    const convertToAspectRatio = (size) => {
      // 이미 비율 형식이면 그대로 반환
      if (size.includes(':')) {
        return size;
      }
      
      // 크기 형식을 비율로 변환
      const sizeMap = {
        '1024x1024': '1:1',
        '512x512': '1:1',
        '768x768': '1:1',
        '1024x768': '4:3',
        '768x1024': '3:4',
        '1024x576': '16:9',
        '576x1024': '9:16',
        '1920x1080': '16:9',
        '1080x1920': '9:16',
        '1024x682': '3:2',
        '682x1024': '2:3',
        '2048x858': '21:9',
        '858x2048': '9:21'
      };
      
      return sizeMap[size] || '1:1'; // 기본값은 1:1
    };

    // 2. 모델별 API 엔드포인트 및 파라미터 설정
    let apiEndpoint;
    let requestBody;

    switch(model) {
      case 'flux-schnell':
        // Flux Schnell (빠른 생성) - image_size 파라미터 사용
        apiEndpoint = "fal-ai/flux/schnell";
        requestBody = {
          prompt: finalPrompt,
          image_size: imageSize, // Schnell은 크기 형식 사용
          num_inference_steps: parameters.steps || 4,
          seed: parameters.seed || Math.floor(Math.random() * 1000000),
          num_images: 1
        };
        break;

      case 'flux-pro':
        // Flux Pro (고품질) - aspect_ratio 파라미터 사용
        apiEndpoint = "fal-ai/flux-pro";
        requestBody = {
          prompt: finalPrompt,
          aspect_ratio: convertToAspectRatio(imageSize), // 비율 형식으로 변환
          num_inference_steps: parameters.steps || 28,
          guidance_scale: parameters.guidance_scale || 3.5,
          safety_tolerance: parameters.safety_tolerance || 2,
          seed: parameters.seed || Math.floor(Math.random() * 1000000),
          output_format: 'jpeg',
          num_images: 1
        };
        break;

      case 'flux-kontext':
        // Flux Kontext (단일 참조 이미지) - aspect_ratio 파라미터 사용
        if (!referenceImages.length) {
          throw new Error('Flux Kontext requires at least one reference image.');
        }
        
        apiEndpoint = "fal-ai/flux-pro/kontext";
        requestBody = {
          prompt: finalPrompt,
          image_url: referenceImages[0],
          aspect_ratio: convertToAspectRatio(imageSize), // 비율 형식으로 변환
          guidance_scale: parameters.guidance_scale || 3.5,
          output_format: 'jpeg',
          num_images: 1,
          seed: parameters.seed || Math.floor(Math.random() * 1000000)
        };
        break;

      case 'flux-kontext-multi':
        // Flux Kontext Multi (다중 참조 이미지) - aspect_ratio 파라미터 사용
        if (!referenceImages.length) {
          throw new Error('Flux Kontext Multi requires reference images.');
        }
        
        apiEndpoint = "fal-ai/flux-pro/kontext/max/multi";
        requestBody = {
          prompt: finalPrompt,
          image_urls: referenceImages,
          aspect_ratio: convertToAspectRatio(imageSize), // 비율 형식으로 변환
          guidance_scale: parameters.guidance_scale || 3.5,
          output_format: 'jpeg',
          num_images: 1,
          seed: parameters.seed || Math.floor(Math.random() * 1000000)
        };
        break;

      default:
        throw new Error(`Unsupported Flux model: ${model}`);
    }

    // 개발 환경 여부 확인 (Netlify 환경 변수 체크)
    // CONTEXT는 'production', 'deploy-preview', 'branch-deploy', 'dev' 중 하나
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));
    
    console.log('Submitting to FAL AI:', {
      endpoint: apiEndpoint,
      model: model,
      isDevelopment: isDevelopment
    });

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

    console.log('Flux Image generation submitted:', request_id);

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

    // 4. 개발 환경에서는 폴링, 프로덕션에서는 즉시 응답
    if (isDevelopment) {
      // 개발 환경: 폴링하여 결과 기다리기
      const maxPollingTime = 60000; // 60초
      const pollingInterval = 2000; // 2초마다 체크
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxPollingTime) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        
        try {
          const status = await fal.queue.status(apiEndpoint, { requestId: request_id });
          console.log(`Polling status for ${request_id}:`, status.status);
          
          if (status.status === 'COMPLETED') {
            const result = await fal.queue.result(apiEndpoint, { requestId: request_id });
            const imageUrl = result.images?.[0]?.url || result.image_url || result.url;
            
            if (imageUrl) {
              // DB 업데이트
              await supabaseAdmin
                .from('gen_images')
                .update({
                  generation_status: 'completed',
                  result_image_url: imageUrl,
                  storage_image_url: imageUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', imageRecord.id);
              
              return {
                success: true,
                data: {
                  ...imageRecord,
                  request_id: request_id,
                  status: 'completed',
                  result_image_url: imageUrl,
                  storage_image_url: imageUrl
                }
              };
            }
          } else if (status.status === 'FAILED') {
            throw new Error('Image generation failed');
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }
      
      // 타임아웃
      throw new Error('Image generation timed out');
      
    } else {
      // 프로덕션: 웹훅이 처리하므로 즉시 응답
      return {
        success: true,
        data: {
          ...imageRecord,
          request_id: request_id,
          status: 'processing',
          message: '이미지 생성이 시작되었습니다. 완료되면 자동으로 갤러리에 표시됩니다.'
        }
      };
    }

  } catch (error) {
    console.error('Flux Image generation error:', error);
    
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