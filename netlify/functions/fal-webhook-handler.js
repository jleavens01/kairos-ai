import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (서비스 키 사용)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  console.log('Webhook handler called:', {
    method: event.httpMethod,
    headers: event.headers,
    hasBody: !!event.body
  });
  
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
    console.log('=== FAL WEBHOOK DATA ===');
    console.log('Full webhook data:', JSON.stringify(webhookData, null, 2));
    console.log('Request ID:', webhookData.request_id);
    console.log('Status:', webhookData.status);
    console.log('Has output:', !!webhookData.output);
    console.log('Has result:', !!webhookData.result);
    console.log('Has data:', !!webhookData.data);
    console.log('=== END WEBHOOK DATA ===');

    // FAL AI 웹훅 데이터 구조에 따라 처리
    // FAL AI는 result, output, data, payload 등 다양한 형태로 결과를 반환할 수 있음
    const request_id = webhookData.request_id || webhookData.requestId || webhookData.gateway_request_id;
    const status = webhookData.status || webhookData.state;
    const output = webhookData.output || webhookData.result || webhookData.data || webhookData.payload;
    const error = webhookData.error;

    if (!request_id) {
      console.error('No request_id in webhook data');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid webhook data: missing request_id' })
      };
    }

    // 이미지 또는 비디오 판별
    const isVideo = output?.video_url || output?.video || 
                   (Array.isArray(output?.videos) && output.videos.length > 0) ||
                   webhookData.video_url || webhookData.video;
    
    if (status === 'COMPLETED' || status === 'completed' || status === 'OK') {
      if (isVideo) {
        // 비디오 처리 - 다양한 경로에서 URL 찾기
        const videoUrl = output?.video?.url ||  // payload.video.url 형식 처리
                        output?.video_url || 
                        output?.video || 
                        (output?.videos && output.videos[0]?.url) ||
                        webhookData.video_url ||
                        webhookData.video ||
                        webhookData.url;
        
        console.log('Extracted video URL:', videoUrl);
        
        if (!videoUrl) {
          console.error('Could not find video URL in webhook data');
          throw new Error('No video URL in webhook output');
        }

        console.log(`Updating gen_videos for request_id: ${request_id}`);
        
        // 먼저 request_id로 비디오를 찾거나, upscale_request_id로 찾기
        let existingVideo;
        let fetchError;
        
        // 일반 비디오 생성인지 먼저 확인
        ({ data: existingVideo, error: fetchError } = await supabase
          .from('gen_videos')
          .select('*')
          .eq('request_id', request_id)
          .single());
        
        // request_id로 못 찾으면 metadata의 upscale_request_id로 검색
        if (fetchError || !existingVideo) {
          console.log(`No video found with request_id, checking upscale_request_id: ${request_id}`);
          ({ data: existingVideo, error: fetchError } = await supabase
            .from('gen_videos')
            .select('*')
            .filter('metadata->upscale_request_id', 'eq', request_id)
            .single());
        }

        if (fetchError || !existingVideo) {
          console.error(`No video found with request_id or upscale_request_id: ${request_id}`);
          throw new Error(`No video record found with request_id: ${request_id}`);
        }

        // 업스케일 작업인지 일반 비디오 생성인지 확인
        const isUpscale = existingVideo.upscale_status === 'processing' || existingVideo.upscale_id;
        
        let updatePayload;
        if (isUpscale) {
          // 업스케일 완료 처리
          console.log(`Processing upscale completion for video ${existingVideo.id}`);
          updatePayload = {
            upscale_status: 'completed',
            upscale_video_url: videoUrl,
            upscaled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          // 일반 비디오 생성 완료 처리
          console.log(`Processing video generation completion for ${request_id}`);
          updatePayload = {
            generation_status: 'completed',
            result_video_url: videoUrl,
            storage_video_url: videoUrl,
            updated_at: new Date().toISOString()
          };
        }

        // 업스케일인 경우 id로 업데이트, 일반 비디오는 request_id로 업데이트
        const updateCondition = isUpscale 
          ? { column: 'id', value: existingVideo.id }
          : { column: 'request_id', value: request_id };
        
        const { data: updateData, error: dbError } = await supabase
          .from('gen_videos')
          .update(updatePayload)
          .eq(updateCondition.column, updateCondition.value)
          .select();

        if (dbError) {
          console.error('DB update error (video):', dbError);
          throw dbError;
        }

        console.log(`Video ${request_id} marked as completed (${isUpscale ? 'upscale' : 'generation'}):`, updateData);
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
    } else if (status === 'FAILED' || status === 'failed' || status === 'ERROR' || status === 'error') {
      // 실패 처리 (이미지/비디오 공통)
      const errorMessage = error?.message || error || webhookData.message || webhookData.error_message || 'Generation failed';
      const table = isVideo ? 'gen_videos' : 'gen_images';

      console.log(`Marking ${table} ${request_id} as failed with error:`, errorMessage);

      if (isVideo) {
        // 비디오의 경우 업스케일인지 확인
        let existingVideo;
        let fetchError;
        
        // 일반 비디오 생성인지 먼저 확인
        ({ data: existingVideo, error: fetchError } = await supabase
          .from('gen_videos')
          .select('*')
          .eq('request_id', request_id)
          .single());
        
        // request_id로 못 찾으면 metadata의 upscale_request_id로 검색
        if (fetchError || !existingVideo) {
          ({ data: existingVideo, error: fetchError } = await supabase
            .from('gen_videos')
            .select('*')
            .filter('metadata->upscale_request_id', 'eq', request_id)
            .single());
        }

        const isUpscale = existingVideo?.upscale_status === 'processing' || existingVideo?.upscale_id;
        
        let updatePayload;
        if (isUpscale) {
          // 업스케일 실패 처리
          updatePayload = {
            upscale_status: 'failed',
            metadata: {
              ...existingVideo?.metadata,
              upscale_error: errorMessage,
              upscale_failed_at: new Date().toISOString(),
              webhook_data: webhookData
            },
            updated_at: new Date().toISOString()
          };
        } else {
          // 일반 비디오 생성 실패 처리
          updatePayload = {
            generation_status: 'failed',
            error_message: errorMessage,
            metadata: {
              ...existingVideo?.metadata,
              error: errorMessage,
              failed_at: new Date().toISOString(),
              webhook_data: webhookData
            },
            updated_at: new Date().toISOString()
          };
        }

        // 업스케일인 경우 id로 업데이트, 일반 비디오는 request_id로 업데이트
        const updateCondition = isUpscale 
          ? { column: 'id', value: existingVideo?.id }
          : { column: 'request_id', value: request_id };
        
        const { error: dbError } = await supabase
          .from('gen_videos')
          .update(updatePayload)
          .eq(updateCondition.column, updateCondition.value);

        if (dbError) {
          console.error('DB update error (video failed):', dbError);
          throw dbError;
        }

        console.log(`Video ${request_id} marked as failed (${isUpscale ? 'upscale' : 'generation'}):`, errorMessage);
      } else {
        // 이미지 실패 처리
        const { error: dbError } = await supabase
          .from(table)
          .update({
            generation_status: 'failed',
            error_message: errorMessage,
            metadata: {
              error: errorMessage,
              failed_at: new Date().toISOString(),
              webhook_data: webhookData
            },
            updated_at: new Date().toISOString()
          })
          .eq('request_id', request_id);

        if (dbError) {
          console.error(`DB update error (${table} failed):`, dbError);
          throw dbError;
        }

        console.log(`Image ${request_id} marked as failed:`, errorMessage);
      }
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