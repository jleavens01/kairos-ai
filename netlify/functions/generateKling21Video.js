// Kling AI 2.1 Pro 모델을 사용한 비디오 생성 (웹훅/폴링 하이브리드)
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { fal } from '@fal-ai/client';

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

const VIDEO_GENERATION_COST = 2000; // Kling 2.1 비디오 생성 비용

export const handler = async (event) => {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', 
    'Access-Control-Allow-Methods': 'POST, OPTIONS' 
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let user;
  let userProfile;

  try {
    // 인증 확인
    const authHeader = event.headers.authorization;
    if (!authHeader) throw { statusCode: 401, message: 'Authorization header is missing.' };
    
    const token = authHeader.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Token is missing.' };
    
    user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    if (!user || !user.sub) throw { statusCode: 401, message: 'Invalid token payload.' };

    // 크레딧 확인 및 차감
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('user_id', user.sub)
      .single();
    
    if (profileError) throw new Error('사용자 프로필을 찾을 수 없습니다.');
    userProfile = profile;

    if (userProfile.credits < VIDEO_GENERATION_COST) {
      return { 
        statusCode: 402, 
        headers, 
        body: JSON.stringify({ error: '크레딧이 부족합니다.' }) 
      };
    }
    
    // 크레딧 차감
    await supabaseAdmin
      .from('profiles')
      .update({ credits: userProfile.credits - VIDEO_GENERATION_COST })
      .eq('user_id', user.sub);

    // 요청 데이터 파싱
    const requestBody = JSON.parse(event.body);
    const { 
      projectId, 
      videoId,  // gen_videos 테이블의 ID
      imageUrl, 
      prompt,
      parameters = {},
      modelParams = {}
    } = requestBody;

    if (!projectId || !videoId || !imageUrl || !prompt) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }

    console.log('Kling 2.1 video generation request:', {
      projectId,
      videoId,
      prompt: prompt.substring(0, 50) + '...',
      imageUrl: imageUrl.substring(0, 50) + '...',
      parameters,
      modelParams
    });

    // Kling 파라미터 설정 (실제 API 스펙에 맞춤)
    const klingParams = {
      duration: modelParams.duration || parameters.duration || 5,
      negative_prompt: modelParams.negative_prompt || parameters.negative_prompt || 'blur, distort, and low quality',
      cfg_scale: modelParams.cfg_scale !== undefined ? modelParams.cfg_scale : (parameters.cfg_scale !== undefined ? parameters.cfg_scale : 0.5)
    };

    // 개발 환경 여부 확인 (Netlify 환경 변수 체크)
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));
    
    console.log('Environment check:', {
      CONTEXT: process.env.CONTEXT,
      NETLIFY_DEV: process.env.NETLIFY_DEV,
      URL: process.env.URL,
      isDevelopment
    });

    // FAL AI API 엔드포인트 (큐 방식)
    const apiEndpoint = 'fal-ai/kling-video/v2.1/pro/image-to-video';
    
    // FAL AI 요청 본문
    const falRequestBody = {
      prompt: prompt,
      image_url: imageUrl,
      duration: klingParams.duration.toString(),
      negative_prompt: klingParams.negative_prompt,
      cfg_scale: klingParams.cfg_scale
    };

    console.log('FAL API Request for Kling 2.1:', JSON.stringify(falRequestBody, null, 2));

    // FAL AI 큐에 제출
    const submitOptions = {
      input: falRequestBody
    };
    
    // 프로덕션 환경에서만 웹훅 사용
    if (!isDevelopment) {
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai.netlify.app';
      submitOptions.webhookUrl = `${baseUrl}/.netlify/functions/fal-webhook-handler`;
      console.log('=== WEBHOOK CONFIGURATION (Kling) ===');
      console.log('Base URL:', baseUrl);
      console.log('Webhook URL:', submitOptions.webhookUrl);
      console.log('=== END WEBHOOK CONFIG ===');
    } else {
      console.log('Using polling for development environment (Kling)');
    }
    
    // FAL AI에 제출
    const { request_id: requestId } = await fal.queue.submit(apiEndpoint, submitOptions);
    console.log('FAL AI request submitted successfully (Kling):', {
      requestId,
      webhookConfigured: !!submitOptions.webhookUrl
    });

    // gen_videos 테이블 업데이트 - request_id 저장
    const { error: updateError } = await supabaseAdmin
      .from('gen_videos')
      .update({
        generation_status: 'processing',
        request_id: requestId,
        credits_used: VIDEO_GENERATION_COST,
        duration_seconds: klingParams.duration || 5,
        negative_prompt: klingParams.negative_prompt,
        model_version: 'kling-2.1-pro',
        metadata: {
          ...requestBody.parameters,
          model: 'kling-2.1-pro',
          klingParams: klingParams,
          cfg_scale: klingParams.cfg_scale,
          startedAt: new Date().toISOString(),
          userId: user.sub,
          creditsCost: VIDEO_GENERATION_COST,
          webhookConfigured: !!submitOptions.webhookUrl
        }
      })
      .eq('id', videoId);
      
    if (updateError) {
      console.error('Failed to update video record:', updateError);
      throw updateError;
    }

    // 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: videoId,
        request_id: requestId,
        status: 'processing',
        message: 'Kling 2.1 비디오 생성이 시작되었습니다. 약 2-5분 소요됩니다.',
        model: 'kling-2.1-pro',
        webhookEnabled: !!submitOptions.webhookUrl
      })
    };

  } catch (error) {
    console.error("Kling 2.1 Video Generation Error:", error);
    
    // 오류 발생 시 크레딧 환불
    if (userProfile && user) {
      await supabaseAdmin
        .from('profiles')
        .update({ credits: userProfile.credits })
        .eq('user_id', user.sub);
    }
    
    // gen_videos 상태를 failed로 업데이트
    if (requestBody?.videoId) {
      await supabaseAdmin
        .from('gen_videos')
        .update({
          generation_status: 'failed',
          metadata: {
            error: error.message,
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', requestBody.videoId);
    }
    
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error.';
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};