import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { fal } from '@fal-ai/client';

// Supabase Admin Client 설정
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,  // 올바른 환경변수명
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// FAL AI 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

export const handler = async (event) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Authorization 헤더 확인
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw { statusCode: 401, message: 'Authorization header missing or invalid.' };
    }

    const token = authHeader.replace('Bearer ', '');
    let user;

    // 개발 환경과 프로덕션 환경 구분
    const isDev = process.env.CONTEXT === 'dev' || process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // 개발 환경: 간단한 검증만 수행
      try {
        const decoded = jwt.decode(token);
        user = decoded;
      } catch {
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
    const { requestId, videoId } = body;

    if (!requestId || !videoId) {
      throw new Error('requestId and videoId are required.');
    }

    console.log('Checking upscale status:', { requestId, videoId });

    // FAL AI 상태 확인 - Topaz Video AI 모델 사용
    let statusResult;
    try {
      statusResult = await fal.queue.status('fal-ai/topaz/upscale/video', {
        requestId,
        logs: true
      });
      console.log('FAL AI status result:', statusResult);
    } catch (statusError) {
      console.error('Error fetching FAL status:', statusError);
      // 상태를 가져올 수 없으면 processing으로 처리
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'processing',
          message: '업스케일 상태 확인 중입니다.'
        })
      };
    }

    // 상태 확인
    if (statusResult?.status === 'COMPLETED') {
      console.log('Upscale completed, fetching result...');
      
      // 결과 가져오기
      let result;
      try {
        result = await fal.queue.result('fal-ai/topaz/upscale/video', {
          requestId
        });
        console.log('FAL AI result:', result);
      } catch (resultError) {
        console.error('Error fetching FAL result:', resultError);
        throw new Error('Failed to fetch upscale result');
      }
      
      // 비디오 URL 추출 (다양한 경로에서 시도)
      const videoUrl = result?.data?.video?.url || 
                      result?.video?.url || 
                      result?.video_url ||
                      result?.url;
      
      if (!videoUrl) {
        console.error('No video URL in result:', result);
        throw new Error('No video URL in upscale result');
      }
      
      console.log('Extracted video URL:', videoUrl);
      
      // 업스케일 완료 - 원본 비디오 레코드 업데이트
      const { error: updateError } = await supabaseAdmin
        .from('gen_videos')
        .update({
          upscale_video_url: videoUrl,
          upscale_status: 'completed',
          upscaled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...body.metadata,
            upscale_completed_response: result,
            upscale_completed_at: new Date().toISOString()
          }
        })
        .eq('id', videoId);

      if (updateError) {
        console.error('Failed to update video record:', updateError);
        throw new Error('Failed to update video record');
      }

      console.log('Video record updated successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'completed',
          videoUrl: videoUrl,
          message: '업스케일이 완료되었습니다.'
        })
      };
    } else if (statusResult?.status === 'FAILED' || statusResult?.status === 'ERROR') {
      // 실패 처리
      console.error('Upscale failed:', statusResult);
      
      const { error: updateError } = await supabaseAdmin
        .from('gen_videos')
        .update({
          upscale_status: 'failed',
          updated_at: new Date().toISOString(),
          metadata: {
            ...body.metadata,
            upscale_error: statusResult.error || 'Upscale failed',
            upscale_failed_at: new Date().toISOString()
          }
        })
        .eq('id', videoId);

      if (updateError) {
        console.error('Failed to update video record:', updateError);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          status: 'failed',
          error: statusResult.error || 'Upscale failed',
          message: '업스케일이 실패했습니다.'
        })
      };
    }

    // 아직 처리 중
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: 'processing',
        message: '업스케일 처리 중입니다.'
      })
    };

  } catch (error) {
    console.error('Error checking upscale status:', error);
    
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to check upscale status'
      })
    };
  }
};