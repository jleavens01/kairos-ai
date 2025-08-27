// FAL AI - ByteDance SeedDance v1 Lite 비디오 생성 함수
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

    // 요청 파싱
    const body = JSON.parse(event.body || '{}');
    const { 
      projectId,
      videoId,  // 라우터에서 전달되는 비디오 ID
      prompt,
      imageUrl, // 시작 이미지 URL
      endImageUrl, // 끝 이미지 URL (선택사항)
      parameters = {},
      modelParams = {},
      category = 'scene',
      elementName,
      sceneId,
      styleId
    } = body;
    
    // 파라미터 추출 (라우터에서 전달된 것 우선)
    const params = { ...parameters, ...modelParams };
    const resolution = params.resolution || "480p";  // Lite는 기본 480p
    const duration = params.duration || 3;  // Lite는 기본 3초
    const cameraFixed = params.cameraFixed || false;
    const seed = params.seed || undefined;

    if (!projectId || !prompt || !imageUrl) {
      throw new Error('projectId, prompt, and imageUrl are required.');
    }

    // Supabase 관리자 클라이언트
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // FAL AI API 호출
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error("Server configuration error: FAL API key is missing.");

    console.log('Calling FAL AI SeedDance Lite API with:', { 
      prompt: prompt.substring(0, 100), 
      resolution, 
      duration,
      cameraFixed 
    });

    // 환경 체크 (개발/프로덕션)
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));

    // FAL AI 엔드포인트 - SeedDance v1 Lite
    const submitUrl = 'https://queue.fal.run/fal-ai/bytedance/seedance/v1/lite/image-to-video/submit';
    
    const requestBody = {
      input: {
        prompt,
        image_url: imageUrl,
        resolution,
        duration: duration.toString(), // FAL expects string
        camera_fixed: cameraFixed
      }
    };

    // 끝 이미지가 제공되면 추가
    if (endImageUrl) {
      requestBody.input.end_image_url = endImageUrl;
      console.log('Using end image for SeedDance Lite:', endImageUrl);
    }

    if (seed !== undefined) {
      requestBody.input.seed = seed;
    }

    // 프로덕션 환경에서 웹훅 URL 추가
    if (!isDevelopment) {
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app';
      requestBody.webhook_url = `${baseUrl}/.netlify/functions/fal-webhook-handler`;
      console.log('Webhook URL configured for Lite:', requestBody.webhook_url);
    }

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('FAL AI submit error:', errorText);
      throw new Error(`FAL AI API Error: ${errorText}`);
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.request_id;
    const statusUrl = submitData.status_url || `https://queue.fal.run/fal-ai/bytedance/seedance/v1/lite/image-to-video/requests/${requestId}/status`;

    console.log('FAL AI request submitted:', requestId, 'Status URL:', statusUrl);

    // 크레딧 계산 (Lite 버전은 더 저렴)
    const calculateCredits = () => {
      // 기본: 480p 3초 = 10 크레딧 ($0.10)
      let credits = 10;
      
      // 해상도에 따른 가중치
      if (resolution === '720p') credits = 15; // $0.15
      
      // 길이에 따른 추가 (3초 기준, 추가 1초당 +10%)
      if (duration > 3) {
        credits = Math.round(credits * (1 + (duration - 3) * 0.1));
      }
      
      return credits;
    };

    // 데이터베이스 업데이트 (라우터에서 이미 생성된 레코드 업데이트)
    const updateData = {
      generation_status: 'processing',
      reference_image_url: imageUrl,
      model_parameters: {
        resolution: resolution,
        duration: parseInt(duration),
        camera_fixed: cameraFixed,
        seed: seed,
        end_image_url: endImageUrl
      },
      request_id: requestId,
      api_request: requestBody, // API 요청 전체 저장
      credits_used: calculateCredits(), // 동적 크레딧 계산
      metadata: {
        status_url: statusUrl,
        fal_request_id: requestId,
        model: 'seedance-lite',
        webhook_configured: !isDevelopment
      },
      updated_at: new Date().toISOString()
    };
    
    // videoId가 있으면 업데이트, 없으면 새로 생성
    let videoRecord;
    if (videoId) {
      const { data, error: dbError } = await supabaseAdmin
        .from('gen_videos')
        .update(updateData)
        .eq('id', videoId)
        .select()
        .single();
      
      if (dbError) {
        console.error('Database update error:', dbError);
        throw new Error('Failed to update video record.');
      }
      videoRecord = data;
    } else {
      // 하위 호환성을 위해 새로 생성도 지원
      const { data, error: dbError } = await supabaseAdmin
        .from('gen_videos')
        .insert({
          project_id: projectId,
          custom_prompt: prompt,
          prompt_used: prompt,
          generation_model: 'seedance-v1-lite',
          video_type: category,
          element_name: elementName || prompt.substring(0, 100),
          created_by: user.sub,
          linked_scene_id: sceneId || null,
          style_id: styleId || null,
          ...updateData
        })
        .select()
        .single();
      
      if (dbError) {
        console.error('Database insert error:', dbError);
        throw new Error('Failed to create video record.');
      }
      videoRecord = data;
    }

    console.log('SeedDance Lite video generation initiated:', videoRecord.id);

    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          id: videoRecord.id,
          status: 'processing',
          requestId: requestId,
          message: 'Video generation started. It will be processed in the background.'
        }
      })
    };

  } catch (error) {
    console.error('Error in generateSeedanceLiteVideo function:', error.message || error);
    
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