// Topaz Video AI를 사용한 비디오 업스케일 함수
import { createClient } from '@supabase/supabase-js';
import { fal } from '@fal-ai/client';
import jwt from 'jsonwebtoken';

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
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // 개발 환경 여부 확인
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'));

    // 사용자 인증
    const authHeader = event.headers.authorization;
    if (!authHeader) throw { statusCode: 401, message: 'Authorization header is missing.' };
    
    const token = authHeader.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Token is missing.' };
    
    // JWT 검증 (개발 환경에서는 간소화)
    if (isDevelopment) {
      // 개발 환경: 토큰을 디코드만 하고 검증은 건너뜀
      try {
        const decoded = jwt.decode(token);
        user = decoded || { sub: 'dev-user-id' };
        console.log('Development mode: Using decoded token or default user');
      } catch (e) {
        console.log('Development mode: Using default user due to decode error');
        user = { sub: 'dev-user-id' };
      }
    } else {
      // 프로덕션 환경: 정상적인 JWT 검증
      try {
        user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        if (!user || !user.sub) throw { statusCode: 401, message: 'Invalid token payload.' };
      } catch (jwtError) {
        console.error('JWT verification error:', jwtError);
        throw { statusCode: 401, message: 'Invalid token.' };
      }
    }

    // 요청 데이터 파싱
    const body = JSON.parse(event.body || '{}');
    const {
      projectId,
      originalVideoId,
      videoUrl,
      upscaleFactor = 2,
      targetFps = null,
      h264Output = false,
      metadata = {}
    } = body;

    if (!projectId || !originalVideoId || !videoUrl) {
      throw new Error('projectId, originalVideoId, and videoUrl are required.');
    }

    console.log('Upscale request:', {
      projectId,
      originalVideoId,
      upscaleFactor,
      targetFps,
      h264Output
    });

    // 1. 원본 비디오 정보 가져오기
    const { data: originalVideo, error: fetchError } = await supabaseAdmin
      .from('gen_videos')
      .select('*')
      .eq('id', originalVideoId)
      .single();

    if (fetchError || !originalVideo) {
      throw new Error('Original video not found');
    }

    // 2. 업스케일 레코드 생성
    const insertData = {
      project_id: projectId,
      video_type: 'upscaled',
      element_name: `${originalVideo.element_name || 'Video'} - Upscaled ${upscaleFactor}x`,
      generation_status: 'pending',
      generation_model: 'topaz-upscale',
      prompt_used: `Upscale ${upscaleFactor}x${targetFps ? ` @ ${targetFps}fps` : ''}`,
      is_upscaled: true,
      original_video_id: originalVideoId,
      upscale_factor: upscaleFactor,
      upscale_target_fps: targetFps,
      upscale_settings: {
        h264_output: h264Output,
        original_metadata: metadata,
        model: 'Proteus v4',
        interpolation_model: targetFps ? 'Apollo v8' : null
      },
      metadata: {
        ...metadata,
        upscale_params: {
          factor: upscaleFactor,
          target_fps: targetFps,
          h264: h264Output
        }
      }
    };

    console.log('Attempting to insert upscale record:', insertData);

    const { data: upscaleRecord, error: insertError } = await supabaseAdmin
      .from('gen_videos')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error details:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      throw new Error(`Failed to create upscale record: ${insertError.message || 'Unknown database error'}`);
    }

    // 3. FAL AI 업스케일 요청
    const falParams = {
      video_url: videoUrl,
      upscale_factor: upscaleFactor
    };

    // 프레임 보간이 필요한 경우 target_fps 추가
    if (targetFps) {
      falParams.target_fps = targetFps;
    }

    // H264 코덱 사용 여부
    if (h264Output) {
      falParams.H264_output = true;
    }

    console.log('Submitting to FAL AI Topaz:', falParams);

    let requestId;
    
    if (!isDevelopment) {
      // 프로덕션: 웹훅 사용
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai.netlify.app';
      const { request_id } = await fal.queue.submit('fal-ai/topaz/upscale/video', {
        input: falParams,
        webhookUrl: `${baseUrl}/.netlify/functions/fal-webhook-handler`
      });
      requestId = request_id;
      console.log('Upscale submitted with webhook:', requestId);
    } else {
      // 개발: 폴링 사용
      const { request_id } = await fal.queue.submit('fal-ai/topaz/upscale/video', {
        input: falParams
      });
      requestId = request_id;
      console.log('Upscale submitted for polling:', requestId);
    }

    // 4. request_id 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('gen_videos')
      .update({
        request_id: requestId,
        generation_status: 'processing',
        metadata: {
          ...upscaleRecord.metadata,
          fal_request_id: requestId,
          submitted_at: new Date().toISOString()
        }
      })
      .eq('id', upscaleRecord.id);

    if (updateError) {
      console.error('Failed to update request_id:', updateError);
    }

    // 5. 개발 환경에서 폴링 시작 (선택적)
    if (isDevelopment) {
      // 비동기로 폴링 시작 (응답은 즉시 반환)
      pollUpscaleStatus(upscaleRecord.id, requestId);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          ...upscaleRecord,
          request_id: requestId,
          status: 'processing',
          message: '업스케일이 시작되었습니다. 완료되면 자동으로 갤러리에 표시됩니다.'
        }
      })
    };

  } catch (error) {
    console.error('Upscale error:', error);
    
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};

// 개발 환경용 폴링 함수
async function pollUpscaleStatus(videoId, requestId) {
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const maxAttempts = 60; // 최대 60번 시도 (10분)
  const pollInterval = 10000; // 10초마다

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const status = await fal.queue.status('fal-ai/topaz/upscale/video', {
        requestId: requestId,
        logs: true
      });

      console.log(`Upscale status (attempt ${attempt + 1}):`, status.status);

      if (status.status === 'COMPLETED') {
        // 결과 가져오기
        const result = await fal.queue.result('fal-ai/topaz/upscale/video', {
          requestId: requestId
        });

        console.log('Upscale completed:', result);

        // 비디오 URL 추출
        const videoUrl = result.data?.video?.url || result.video?.url;
        
        if (!videoUrl) {
          throw new Error('No video URL in upscale result');
        }

        // Storage에 저장
        const videoResponse = await fetch(videoUrl);
        const videoBlob = await videoResponse.blob();
        const videoBuffer = await videoBlob.arrayBuffer();
        const videoData = Buffer.from(videoBuffer);
        
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const fileName = `upscaled/${timestamp}-${randomId}.mp4`;
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from('gen-videos')
          .upload(fileName, videoData, {
            contentType: 'video/mp4',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        // Storage URL 생성
        const { data: { publicUrl } } = supabaseAdmin
          .storage
          .from('gen-videos')
          .getPublicUrl(fileName);

        // DB 업데이트
        await supabaseAdmin
          .from('gen_videos')
          .update({
            generation_status: 'completed',
            result_video_url: videoUrl,
            storage_video_url: publicUrl,
            completed_at: new Date().toISOString(),
            metadata: {
              completed_response: result.data || result,
              processing_time: attempt * pollInterval
            }
          })
          .eq('id', videoId);

        console.log('Upscale video saved successfully');
        return;
      } else if (status.status === 'FAILED' || status.status === 'ERROR') {
        // 실패 처리
        await supabaseAdmin
          .from('gen_videos')
          .update({
            generation_status: 'failed',
            metadata: {
              error: status.error || 'Upscale failed',
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', videoId);

        console.error('Upscale failed:', status);
        return;
      }
    } catch (error) {
      console.error('Polling error:', error);
      
      // 마지막 시도에서 에러 발생 시 실패로 처리
      if (attempt === maxAttempts - 1) {
        await supabaseAdmin
          .from('gen_videos')
          .update({
            generation_status: 'failed',
            metadata: {
              error: 'Polling timeout',
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', videoId);
      }
    }
  }
}