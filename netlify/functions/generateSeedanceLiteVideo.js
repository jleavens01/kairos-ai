// FAL AI - ByteDance SeedDance v1 Lite 비디오 생성 함수
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { fal } from '@fal-ai/client';

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

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

    console.log('Calling FAL AI SeedDance Lite API with:', { 
      prompt: prompt.substring(0, 100), 
      resolution, 
      duration,
      cameraFixed,
      imageUrl: imageUrl?.substring(0, 200) + '...',
      endImageUrl: endImageUrl ? endImageUrl.substring(0, 200) + '...' : null
    });

    // 환경 체크 (개발/프로덕션)
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));

    // FAL AI 엔드포인트 - SeedDance v1 Lite
    const apiEndpoint = 'fal-ai/bytedance/seedance/v1/lite/image-to-video';
    
    // FAL AI 요청 본문 구성
    const falRequestBody = {
      prompt,
      image_url: imageUrl,
      resolution,
      duration: duration.toString(), // FAL expects string
      camera_fixed: cameraFixed
    };

    // 끝 이미지가 제공되면 추가
    if (endImageUrl) {
      falRequestBody.end_image_url = endImageUrl;
      console.log('Using end image for SeedDance Lite:', endImageUrl);
    }

    // 요청 크기 로깅
    const requestSize = JSON.stringify(falRequestBody).length;
    console.log('FAL AI request size:', requestSize, 'bytes');
    console.log('Image URL lengths:', {
      imageUrl: imageUrl?.length || 0,
      endImageUrl: endImageUrl?.length || 0
    });
    
    // 요청 크기가 너무 큰 경우 에러 발생
    if (requestSize > 512 * 1024) { // 512KB 초과시 에러
      throw new Error(`Request too large (${Math.round(requestSize/1024)}KB). Please use smaller images or shorter URLs.`);
    }
    
    // 이미지 URL이 너무 긴 경우 경고
    if (imageUrl && imageUrl.length > 2000) {
      console.warn('Image URL is very long:', imageUrl.length, 'characters');
    }
    if (endImageUrl && endImageUrl.length > 2000) {
      console.warn('End image URL is very long:', endImageUrl.length, 'characters');
    }

    if (seed !== undefined) {
      falRequestBody.seed = seed;
    }

    // FAL AI 큐에 제출
    const submitOptions = {
      input: falRequestBody
    };
    
    // 프로덕션 환경에서 웹훅 URL 추가
    if (!isDevelopment) {
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app';
      submitOptions.webhookUrl = `${baseUrl}/.netlify/functions/fal-webhook-handler`;
      console.log('Webhook URL configured for Lite:', submitOptions.webhookUrl);
    } else {
      console.log('Using polling for development environment');
    }

    // FAL AI SDK를 사용하여 제출
    console.log('Submitting to FAL AI with endpoint:', apiEndpoint);
    const { request_id: requestId } = await fal.queue.submit(apiEndpoint, submitOptions);
    
    console.log('FAL AI request submitted successfully:', {
      requestId,
      webhookConfigured: !!submitOptions.webhookUrl
    });

    // 크레딧 계산 (실제 비용 기준 조정)
    const calculateCredits = () => {
      // SeedDance v1 Lite: 고정 1000 크레딧 ($10.00)
      return 1000;
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
      api_request: { input: falRequestBody }, // API 요청 전체 저장
      credits_used: calculateCredits(), // 동적 크레딧 계산
      metadata: {
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