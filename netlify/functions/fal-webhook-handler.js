import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (서비스 키 사용)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const handler = async (event) => {
  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // 웹훅 인증 (선택사항 - FAL AI 서명 검증)
  const signature = event.headers['x-fal-signature'];
  if (process.env.FAL_WEBHOOK_SECRET && signature) {
    // TODO: 서명 검증 로직 추가
  }

  try {
    const webhookData = JSON.parse(event.body);
    console.log('FAL Webhook received:', {
      request_id: webhookData.request_id,
      status: webhookData.status,
      type: webhookData.type || 'unknown'
    });

    // FAL AI 웹훅 데이터 구조에 따라 처리
    const { request_id, status, output, error } = webhookData;

    if (!request_id) {
      console.error('No request_id in webhook data');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid webhook data: missing request_id' })
      };
    }

    // 이미지 또는 비디오 판별
    const isVideo = output?.video_url || output?.video || 
                   (Array.isArray(output?.videos) && output.videos.length > 0);
    
    if (status === 'COMPLETED' || status === 'completed') {
      if (isVideo) {
        // 비디오 처리
        const videoUrl = output.video_url || output.video || 
                        (output.videos && output.videos[0]?.url);
        
        if (!videoUrl) {
          throw new Error('No video URL in webhook output');
        }

        const { error: dbError } = await supabase
          .from('gen_videos')
          .update({
            generation_status: 'completed',
            result_video_url: videoUrl,
            storage_video_url: videoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('request_id', request_id);

        if (dbError) {
          console.error('DB update error (video):', dbError);
          throw dbError;
        }

        console.log(`Video ${request_id} marked as completed`);
      } else {
        // 이미지 처리
        const imageUrl = output?.images?.[0]?.url || output?.image_url || output?.url;
        
        if (!imageUrl) {
          throw new Error('No image URL in webhook output');
        }

        const { error: dbError } = await supabase
          .from('gen_images')
          .update({
            generation_status: 'completed',
            result_image_url: imageUrl,
            storage_image_url: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('request_id', request_id);

        if (dbError) {
          console.error('DB update error (image):', dbError);
          throw dbError;
        }

        console.log(`Image ${request_id} marked as completed`);
      }
    } else if (status === 'FAILED' || status === 'failed' || status === 'error') {
      // 실패 처리 (이미지/비디오 공통)
      const errorMessage = error?.message || error || 'Generation failed';
      const table = isVideo ? 'gen_videos' : 'gen_images';

      const { error: dbError } = await supabase
        .from(table)
        .update({
          generation_status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (dbError) {
        console.error(`DB update error (${table} failed):`, dbError);
        throw dbError;
      }

      console.log(`${isVideo ? 'Video' : 'Image'} ${request_id} marked as failed:`, errorMessage);
    } else if (status === 'IN_PROGRESS' || status === 'in_progress' || status === 'processing') {
      // 진행 중 상태 업데이트 (선택사항)
      console.log(`${isVideo ? 'Video' : 'Image'} ${request_id} is still processing`);
      
      // 필요하다면 진행 상태도 DB에 업데이트
      // const table = isVideo ? 'gen_videos' : 'gen_images';
      // await supabase.from(table).update({
      //   generation_status: 'processing',
      //   updated_at: new Date().toISOString()
      // }).eq('request_id', request_id);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Webhook processed successfully',
        request_id 
      })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // 에러를 기록하되 200을 반환 (재시도 방지)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Error logged but acknowledged to prevent retry'
      })
    };
  }
};