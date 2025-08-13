// SeedDance Pro 비디오 생성 함수 (웹훅/폴링 하이브리드)
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
    if (!authHeader) throw new Error("Authorization header is missing.");
    
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error("Token is missing.");
    
    // JWT 검증
    try {
      user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      if (!user || !user.sub) throw new Error("Invalid token payload.");
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      throw new Error("Invalid token.");
    }

    // 요청 데이터 파싱
    const {
      projectId,
      sceneNumber,
      sceneName,
      prompt = '',
      imageUrl,
      resolution = '360p',
      duration = 3,
      cameraFixed = false,
      seed,
      sourceImageId
    } = JSON.parse(event.body || '{}');

    if (!projectId || !imageUrl) {
      throw new Error("Missing required parameters.");
    }

    // Supabase 관리자 클라이언트
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Calling FAL AI SeedDance API with:', { 
      prompt: prompt.substring(0, 100), 
      resolution, 
      duration,
      cameraFixed 
    });

    // 개발 환경 여부 확인 (Netlify 환경 변수 체크)
    const isDevelopment = !process.env.CONTEXT || process.env.CONTEXT === 'dev' || 
                         !process.env.URL || process.env.URL.includes('localhost');
    
    // FAL AI 엔드포인트 - SeedDance Pro
    const apiEndpoint = 'fal-ai/bytedance/seedance/v1/pro/image-to-video';
    
    // SeedDance Pro는 360p를 지원하지 않음, 480p로 변경
    const validResolution = resolution === '360p' ? '480p' : resolution;
    
    const requestBody = {
      prompt,
      image_url: imageUrl,
      resolution: validResolution, // "480p", "720p", "1080p" 중 하나
      duration: duration.toString(), // "3"~"12" 문자열
      camera_fixed: cameraFixed // boolean
    };
    
    if (seed !== undefined) {
      requestBody.seed = seed;
    }

    // FAL AI 큐에 제출
    const submitOptions = {
      input: requestBody
    };
    
    // 프로덕션 환경에서만 웹훅 사용
    if (!isDevelopment) {
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai.netlify.app';
      submitOptions.webhookUrl = `${baseUrl}/.netlify/functions/fal-webhook-handler`;
      console.log('Using webhook for production environment:', submitOptions.webhookUrl);
    } else {
      console.log('Using polling for development environment');
    }
    
    // 크레딧 계산 (대략적인 가격 기준)
    const calculateCredits = () => {
      // 기본: 480p 3초 = 20 크레딧 ($0.20)
      let credits = 20;
      
      // 해상도에 따른 가중치 (validResolution 사용)
      const resolutionMultipliers = {
        '480p': 1.0,
        '720p': 1.5,
        '1080p': 2.0
      };
      
      // 지속시간에 따른 가중치 (3초 기준)
      const durationMultiplier = duration / 3;
      
      credits = Math.ceil(credits * (resolutionMultipliers[validResolution] || 1.0) * durationMultiplier);
      
      return credits;
    };

    const creditsUsed = calculateCredits();

    // 먼저 DB에 초기 레코드 생성 (request_id 없이)
    const { data: videoRecord, error: dbError } = await supabaseAdmin
      .from('gen_videos')
      .insert({
        project_id: projectId,
        scene_number: sceneNumber,
        scene_name: sceneName,
        prompt_used: prompt,
        generation_model: 'seedance-pro',
        model_parameters: {
          resolution,
          duration,
          camera_fixed: cameraFixed,
          seed
        },
        image_reference_url: imageUrl,
        source_image_id: sourceImageId,
        generation_status: 'pending',
        credits_used: creditsUsed,
        user_id: user.sub
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', {
        error: dbError,
        data: {
          project_id: projectId,
          user_id: user.sub,
          scene_number: sceneNumber,
          scene_name: sceneName
        }
      });
      throw new Error(`Failed to create video record: ${dbError.message || dbError}`);
    }

    // FAL AI에 제출
    const { request_id: requestId } = await fal.queue.submit(apiEndpoint, submitOptions);

    console.log('FAL AI request submitted:', requestId);

    // DB에 request_id 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('gen_videos')
      .update({
        request_id: requestId,
        generation_status: 'processing'
      })
      .eq('id', videoRecord.id);

    if (updateError) {
      console.error('Failed to update request_id:', updateError);
    }

    // 개발 환경에서는 폴링, 프로덕션에서는 즉시 응답
    if (isDevelopment) {
      // 개발 환경: 폴링하여 결과 기다리기
      const maxPollingTime = 120000; // 120초
      const pollingInterval = 3000; // 3초마다 체크
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxPollingTime) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        
        try {
          const status = await fal.queue.status(apiEndpoint, { requestId });
          console.log(`Polling status for ${requestId}:`, status.status);
          
          if (status.status === 'COMPLETED') {
            const result = await fal.queue.result(apiEndpoint, { requestId });
            const videoUrl = result.video_url || result.video || 
                           (result.videos && result.videos[0]?.url);
            
            if (videoUrl) {
              // DB 업데이트
              await supabaseAdmin
                .from('gen_videos')
                .update({
                  generation_status: 'completed',
                  result_video_url: videoUrl,
                  storage_video_url: videoUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', videoRecord.id);
              
              return {
                statusCode: 200,
                headers: {
                  ...headers,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  success: true,
                  data: {
                    ...videoRecord,
                    request_id: requestId,
                    result_video_url: videoUrl,
                    status: 'completed'
                  }
                })
              };
            }
          } else if (status.status === 'FAILED') {
            throw new Error('Video generation failed');
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }
      
      // 타임아웃
      throw new Error('Video generation timed out');
      
    } else {
      // 프로덕션: 웹훅이 처리하므로 즉시 응답
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          data: {
            ...videoRecord,
            request_id: requestId,
            status: 'processing',
            message: '비디오 생성이 시작되었습니다. 완료되면 자동으로 갤러리에 표시됩니다.'
          }
        })
      };
    }

  } catch (error) {
    console.error('SeedDance video generation error:', error);
    
    const statusCode = error.message.includes("Authorization") || error.message.includes("token") 
      ? 401 
      : error.message.includes("Missing required") 
      ? 400 
      : 500;
    
    return {
      statusCode,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || "Internal server error" 
      })
    };
  }
};