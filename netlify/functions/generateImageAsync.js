// AI 이미지 생성 함수 (비동기 처리)
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  let user;
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // 사용자 인증
    const authHeader = event.headers.authorization;
    if (!authHeader) throw { statusCode: 401, message: 'Authorization header is missing.' };
    
    const token = authHeader.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Token is missing.' };
    
    // JWT 검증
    try {
      user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      if (!user || !user.sub) throw { statusCode: 401, message: 'Invalid token payload.' };
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      throw { statusCode: 401, message: 'Invalid token.' };
    }

    // 요청 데이터 파싱
    const {
      projectId,
      prompt,
      model = 'gpt-image-1',
      imageSize = '1024x1024',
      category = 'scene',
      characterName,
      parameters = {},
      referenceImages = [],
      sceneId = null,
      styleId = null
    } = JSON.parse(event.body || '{}');

    if (!projectId || !prompt) {
      throw new Error('projectId and prompt are required.');
    }

    console.log('Image generation async request:', {
      projectId,
      model,
      imageSize,
      category,
      hasReferenceImages: referenceImages.length > 0,
      parameters
    });

    // 1. 먼저 DB에 pending 상태로 기록 생성
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert({
        project_id: projectId,
        production_sheet_id: sceneId,
        image_type: category,
        element_name: characterName || prompt.substring(0, 100),
        generation_status: 'pending',
        prompt_used: prompt,
        custom_prompt: prompt, // 사용자가 입력한 원본 프롬프트 저장
        generation_model: model,
        model_parameters: parameters,
        reference_image_url: referenceImages[0] || null,
        style_id: styleId,
        metadata: {
          width: imageSize.includes('x') ? parseInt(imageSize.split('x')[0]) : null,
          height: imageSize.includes('x') ? parseInt(imageSize.split('x')[1]) : null,
          aspect_ratio: imageSize.includes(':') ? imageSize : null,
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

    // 2. FAL AI API 호출 준비
    let apiEndpoint;
    let requestBody;

    // 모델별 API 설정
    if (model === 'flux-pro') {
      // Flux Pro 기본 모델 (참조 이미지 없음)
      apiEndpoint = 'https://queue.fal.run/fal-ai/flux-pro';
      requestBody = {
        prompt: prompt,
        aspect_ratio: imageSize, // aspect_ratio 사용 (image_size 대신)
        num_inference_steps: parameters.steps || 28,
        guidance_scale: parameters.guidance_scale || 3.5,
        num_images: 1,
        output_format: 'jpeg',
        safety_tolerance: parameters.safety_tolerance || 2,
        seed: parameters.seed || Math.floor(Math.random() * 1000000)
      };
      
    } else if (model === 'flux-kontext') {
      // Flux Kontext (단일 참조 이미지)
      if (!referenceImages.length) {
        throw new Error('Flux Kontext requires at least one reference image.');
      }
      
      apiEndpoint = 'https://queue.fal.run/fal-ai/flux-pro/kontext';
      requestBody = {
        prompt: prompt,
        image_url: referenceImages[0],
        aspect_ratio: imageSize, // aspect_ratio 사용 (image_size 대신)
        guidance_scale: parameters.guidance_scale || 3.5,
        output_format: 'jpeg',
        num_images: 1,
        seed: parameters.seed || Math.floor(Math.random() * 1000000)
      };
      
    } else if (model === 'flux-kontext-multi') {
      // Flux Kontext Multi (다중 참조 이미지)
      if (!referenceImages.length) {
        throw new Error('Flux Kontext Multi requires reference images.');
      }
      
      apiEndpoint = 'https://queue.fal.run/fal-ai/flux-pro/kontext/max/multi';
      requestBody = {
        prompt: prompt,
        image_urls: referenceImages,
        aspect_ratio: imageSize, // aspect_ratio 사용 (image_size 대신)
        guidance_scale: parameters.guidance_scale || 3.5,
        output_format: 'jpeg',
        num_images: 1,
        seed: parameters.seed || Math.floor(Math.random() * 1000000)
      };
      
    } else {
      // 기본 GPT-Image-1 모델
      if (referenceImages.length > 0) {
        // 참조 이미지가 있을 때
        apiEndpoint = 'https://queue.fal.run/fal-ai/gpt-image-1/edit-image/byok';
        requestBody = {
          prompt: prompt,
          image_urls: referenceImages,  // image_urls 파라미터 사용
          size: imageSize,
          num_images: 1,
          openai_api_key: process.env.OPENAI_API_KEY
        };
      } else {
        // 참조 이미지가 없을 때
        apiEndpoint = 'https://queue.fal.run/fal-ai/gpt-image-1/text-to-image/byok';
        requestBody = {
          prompt: prompt,
          size: imageSize,
          num_images: 1,
          openai_api_key: process.env.OPENAI_API_KEY
        };
      }
    }

    console.log('FAL API Request:', {
      endpoint: apiEndpoint,
      model: model,
      requestBody: requestBody
    });

    // 3. FAL AI API 호출 (비동기 큐)
    const falResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('FAL API Error:', errorText);
      
      // 422 오류 또는 다른 오류 발생 시 DB 상태를 즉시 failed로 업데이트
      let errorMessage = errorText;
      let errorDetails = {};
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.detail || errorText;
        errorDetails = errorJson;
      } catch (e) {
        // JSON 파싱 실패 시 원본 텍스트 사용
      }
      
      await supabaseAdmin
        .from('gen_images')
        .update({
          generation_status: 'failed',
          metadata: {
            ...imageRecord.metadata,
            error: errorMessage,
            error_code: falResponse.status,
            error_details: errorDetails,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', imageRecord.id);
        
      // 422 오류는 특별히 처리 (Validation Error)
      if (falResponse.status === 422) {
        console.error('FAL API Validation Error (422):', errorMessage);
        throw new Error(`이미지 생성 실패: ${errorMessage}`);
      }
        
      throw new Error(`FAL AI API request failed: ${errorText}`);
    }

    const falResult = await falResponse.json();
    console.log('FAL API Response:', falResult);

    // 4. request_id 저장 및 상태를 processing으로 업데이트
    if (falResult.request_id) {
      // FAL AI status URL 형식 확인
      let statusUrl = falResult.status_url || falResult.response_url;
      
      // status URL이 없으면 request_id로 생성
      if (!statusUrl) {
        // FAL AI의 기본 status URL 패턴
        statusUrl = `https://queue.fal.run/fal-ai/requests/${falResult.request_id}/status`;
      }
      
      console.log('Status URL:', statusUrl);
      
      await supabaseAdmin
        .from('gen_images')
        .update({
          generation_status: 'processing',
          request_id: falResult.request_id,
          metadata: {
            ...imageRecord.metadata,
            status_url: statusUrl,
            fal_response: falResult // 디버깅을 위해 전체 응답 저장
          }
        })
        .eq('id', imageRecord.id);
    }

    // 5. 백그라운드 처리를 위한 폴링 시작 (클라이언트에서 처리하도록 변경)

    // 6. 성공 응답 (Realtime으로 자동 업데이트)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          id: imageRecord.id,
          request_id: falResult.request_id,
          status: 'processing',
          message: '이미지 생성이 시작되었습니다. 잠시 후 갤러리에서 확인해주세요.'
        }
      })
    };

  } catch (error) {
    console.error('Error in generateImageAsync function:', error.message || error);
    
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error.';
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    };
  }
};