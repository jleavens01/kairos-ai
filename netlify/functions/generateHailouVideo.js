// MiniMax Hailou 02 Standard/Pro 모델을 사용한 비디오 생성 (웹훅/폴링 하이브리드)
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { fal } from '@fal-ai/client';

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

const VIDEO_GENERATION_COST_STANDARD = 1000; // Hailou 02 Standard 비용 ($10.00)
const VIDEO_GENERATION_COST_PRO = 1500; // Hailou 02 Pro 비용 ($15.00)

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

    // 요청 데이터 파싱
    const requestBody = JSON.parse(event.body);
    const { 
      projectId, 
      videoId,  // gen_videos 테이블의 ID
      imageUrl, 
      prompt,
      model,  // hailou02-standard 또는 hailou02-pro
      parameters = {},
      modelParams = {}
    } = requestBody;

    // 모델에 따른 비용 결정
    const isPro = model && model.includes('pro');
    const VIDEO_GENERATION_COST = isPro ? VIDEO_GENERATION_COST_PRO : VIDEO_GENERATION_COST_STANDARD;
    
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

    if (!projectId || !videoId || !imageUrl || !prompt) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }

    console.log('Hailou 02 video generation request:', {
      projectId,
      videoId,
      model,
      prompt: prompt.substring(0, 50) + '...',
      imageUrl: imageUrl.substring(0, 50) + '...',
      parameters,
      modelParams
    });

    // 개발 환경 여부 확인 (Netlify 환경 변수 체크)
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));
    
    console.log('Environment check (Hailou):', {
      CONTEXT: process.env.CONTEXT,
      NETLIFY_DEV: process.env.NETLIFY_DEV,
      URL: process.env.URL,
      isDevelopment
    });

    // Pro와 Standard 분기 처리
    let apiEndpoint;
    let falRequestBody;
    
    if (isPro) {
      // Hailou 02 Pro - 단순한 파라미터
      apiEndpoint = 'fal-ai/minimax/hailuo-02/pro/image-to-video';
      falRequestBody = {
        prompt: prompt,
        image_url: imageUrl,
        prompt_optimizer: modelParams.prompt_optimizer !== undefined ? modelParams.prompt_optimizer : true
      };
    } else {
      // Hailou 02 Standard - 더 많은 파라미터
      apiEndpoint = 'fal-ai/minimax/hailuo-02/standard/image-to-video';
      falRequestBody = {
        prompt: prompt,
        image_url: imageUrl,
        duration: modelParams.duration || 6,  // 6 또는 10초
        resolution: modelParams.resolution || '768P',  // 512P 또는 768P
        prompt_optimizer: modelParams.prompt_optimizer !== undefined ? modelParams.prompt_optimizer : true
      };
    }
    
    console.log('FAL AI 요청 (Hailou):', {
      endpoint: apiEndpoint,
      request: falRequestBody
    });

    // FAL AI 큐에 제출
    const submitOptions = {
      input: falRequestBody
    };
    
    // 프로덕션 환경에서만 웹훅 사용
    if (!isDevelopment) {
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app';
      submitOptions.webhookUrl = `${baseUrl}/.netlify/functions/fal-webhook-handler`;
      console.log('=== WEBHOOK CONFIGURATION (Hailou) ===');
      console.log('Base URL:', baseUrl);
      console.log('Webhook URL:', submitOptions.webhookUrl);
      console.log('=== END WEBHOOK CONFIG ===');
    } else {
      console.log('Using polling for development environment (Hailou)');
    }
    
    // FAL AI에 제출
    const { request_id: requestId } = await fal.queue.submit(apiEndpoint, submitOptions);
    console.log('FAL AI request submitted successfully (Hailou):', {
      requestId,
      webhookConfigured: !!submitOptions.webhookUrl
    });

    // gen_videos 테이블 업데이트 - request_id 저장
    const updateData = {
      generation_status: 'processing',
      request_id: requestId,
      credits_used: VIDEO_GENERATION_COST,
      prompt_optimizer: modelParams.prompt_optimizer,
      model_version: isPro ? 'hailou-02-pro' : 'hailou-02-standard',
      metadata: {
        ...requestBody.parameters,
        model: model,
        modelParams: modelParams,
        isPro: isPro,
        startedAt: new Date().toISOString(),
        userId: user.sub,
        creditsCost: VIDEO_GENERATION_COST,
        webhookConfigured: !!submitOptions.webhookUrl
      }
    };

    // Standard 모델인 경우 추가 파라미터
    if (!isPro) {
      updateData.duration_seconds = modelParams.duration || 6;
      updateData.resolution = modelParams.resolution || '768P';
    } else {
      updateData.duration_seconds = 5; // Pro는 5초 고정
    }

    const { error: updateError } = await supabaseAdmin
      .from('gen_videos')
      .update(updateData)
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
        message: `Hailou 02 ${isPro ? 'Pro' : 'Standard'} 비디오 생성이 시작되었습니다. 약 2-3분 소요됩니다.`,
        model: model,
        duration: isPro ? 10 : (modelParams.duration || 6)  // Pro는 10초 고정, Standard는 설정값
      })
    };

  } catch (error) {
    console.error("Hailou 02 Video Generation Error:", error);
    
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