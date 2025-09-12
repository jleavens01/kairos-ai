// FAL AI 생성 실패 체크 및 처리 함수
import { createClient } from '@supabase/supabase-js';
import { fal } from "@fal-ai/client";

// Supabase 클라이언트 초기화 (서비스 키 사용)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

export const handler = async (event) => {
  console.log('=== FAILED GENERATIONS CHECK START ===');
  
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // 5분 전에 생성되었지만 아직 processing 상태인 작업들 찾기
    const [imageQuery, videoQuery] = await Promise.all([
      // 이미지 처리중 작업 조회
      supabase
        .from('gen_images')
        .select('*')
        .eq('generation_status', 'processing')
        .lt('created_at', fiveMinutesAgo)
        .not('request_id', 'is', null),
      
      // 비디오 처리중 작업 조회
      supabase
        .from('gen_videos')
        .select('*')
        .eq('generation_status', 'processing')
        .lt('created_at', fiveMinutesAgo)
        .not('request_id', 'is', null)
    ]);

    const stuckImages = imageQuery.data || [];
    const stuckVideos = videoQuery.data || [];
    
    console.log(`Found ${stuckImages.length} stuck images and ${stuckVideos.length} stuck videos`);
    
    const checkResults = {
      checked: 0,
      completed: 0,
      failed: 0,
      errors: []
    };

    // 이미지 상태 확인
    for (const image of stuckImages) {
      try {
        console.log(`Checking image status: ${image.request_id}`);
        
        const status = await fal.queue.status(image.request_id);
        checkResults.checked++;
        
        console.log(`Image ${image.request_id} status:`, status);
        
        if (status.status === 'COMPLETED') {
          // 완료됨 - 웹훅이 실패했거나 누락된 경우
          const output = status.output || status.result || status.data;
          const imageUrl = output?.images?.[0]?.url || output?.image_url || output?.url;
          
          if (imageUrl) {
            await supabase
              .from('gen_images')
              .update({
                generation_status: 'completed',
                result_image_url: imageUrl,
                
                updated_at: new Date().toISOString(),
                metadata: {
                  ...image.metadata,
                  recovered_by_polling: true,
                  recovered_at: new Date().toISOString()
                }
              })
              .eq('id', image.id);
            
            checkResults.completed++;
            console.log(`Image ${image.request_id} recovered as completed`);
          } else {
            throw new Error('No image URL in completed result');
          }
        } else if (status.status === 'FAILED' || status.status === 'ERROR') {
          // 실패함
          const errorMessage = status.error?.message || status.error || status.message || 'Generation failed';
          
          await supabase
            .from('gen_images')
            .update({
              generation_status: 'failed',
              error_message: errorMessage,
              updated_at: new Date().toISOString(),
              metadata: {
                ...image.metadata,
                recovered_by_polling: true,
                recovered_at: new Date().toISOString(),
                fal_status: status
              }
            })
            .eq('id', image.id);
          
          checkResults.failed++;
          console.log(`Image ${image.request_id} marked as failed: ${errorMessage}`);
        } else if (status.status === 'IN_PROGRESS' || status.status === 'IN_QUEUE') {
          // 아직 진행 중 - 더 기다림
          console.log(`Image ${image.request_id} still in progress, will check again later`);
        }
        
      } catch (error) {
        console.error(`Error checking image ${image.request_id}:`, error);
        checkResults.errors.push({
          type: 'image',
          id: image.id,
          request_id: image.request_id,
          error: error.message
        });
        
        // FAL API 에러인 경우 실패로 처리
        if (error.message.includes('not found') || error.message.includes('404')) {
          await supabase
            .from('gen_images')
            .update({
              generation_status: 'failed',
              error_message: `Request not found: ${error.message}`,
              updated_at: new Date().toISOString(),
              metadata: {
                ...image.metadata,
                recovered_by_polling: true,
                recovered_at: new Date().toISOString(),
                polling_error: error.message
              }
            })
            .eq('id', image.id);
          
          checkResults.failed++;
          console.log(`Image ${image.request_id} marked as failed due to API error`);
        }
      }
    }

    // 비디오 상태 확인
    for (const video of stuckVideos) {
      try {
        console.log(`Checking video status: ${video.request_id}`);
        
        const status = await fal.queue.status(video.request_id);
        checkResults.checked++;
        
        console.log(`Video ${video.request_id} status:`, status);
        
        if (status.status === 'COMPLETED') {
          // 완료됨 - 웹훅이 실패했거나 누락된 경우
          const output = status.output || status.result || status.data;
          const videoUrl = output?.video?.url || output?.video_url || output?.video || 
                          (output?.videos && output.videos[0]?.url) || output?.url;
          
          if (videoUrl) {
            await supabase
              .from('gen_videos')
              .update({
                generation_status: 'completed',
                result_video_url: videoUrl,
                storage_video_url: videoUrl,
                updated_at: new Date().toISOString(),
                metadata: {
                  ...video.metadata,
                  recovered_by_polling: true,
                  recovered_at: new Date().toISOString()
                }
              })
              .eq('id', video.id);
            
            checkResults.completed++;
            console.log(`Video ${video.request_id} recovered as completed`);
          } else {
            throw new Error('No video URL in completed result');
          }
        } else if (status.status === 'FAILED' || status.status === 'ERROR') {
          // 실패함
          const errorMessage = status.error?.message || status.error || status.message || 'Generation failed';
          
          await supabase
            .from('gen_videos')
            .update({
              generation_status: 'failed',
              error_message: errorMessage,
              updated_at: new Date().toISOString(),
              metadata: {
                ...video.metadata,
                recovered_by_polling: true,
                recovered_at: new Date().toISOString(),
                fal_status: status
              }
            })
            .eq('id', video.id);
          
          checkResults.failed++;
          console.log(`Video ${video.request_id} marked as failed: ${errorMessage}`);
        } else if (status.status === 'IN_PROGRESS' || status.status === 'IN_QUEUE') {
          // 아직 진행 중 - 더 기다림
          console.log(`Video ${video.request_id} still in progress, will check again later`);
        }
        
      } catch (error) {
        console.error(`Error checking video ${video.request_id}:`, error);
        checkResults.errors.push({
          type: 'video',
          id: video.id,
          request_id: video.request_id,
          error: error.message
        });
        
        // FAL API 에러인 경우 실패로 처리
        if (error.message.includes('not found') || error.message.includes('404')) {
          await supabase
            .from('gen_videos')
            .update({
              generation_status: 'failed',
              error_message: `Request not found: ${error.message}`,
              updated_at: new Date().toISOString(),
              metadata: {
                ...video.metadata,
                recovered_by_polling: true,
                recovered_at: new Date().toISOString(),
                polling_error: error.message
              }
            })
            .eq('id', video.id);
          
          checkResults.failed++;
          console.log(`Video ${video.request_id} marked as failed due to API error`);
        }
      }
    }

    console.log('=== FAILED GENERATIONS CHECK COMPLETE ===', {
      foundStuck: stuckImages.length + stuckVideos.length,
      checked: checkResults.checked,
      completed: checkResults.completed,
      failed: checkResults.failed,
      errors: checkResults.errors.length,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        summary: {
          foundStuck: stuckImages.length + stuckVideos.length,
          checked: checkResults.checked,
          completed: checkResults.completed,
          failed: checkResults.failed,
          errors: checkResults.errors.length
        },
        details: checkResults,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Failed generations check error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};