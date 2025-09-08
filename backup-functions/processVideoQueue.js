// 백그라운드에서 비디오 생성 상태를 확인하는 워커 함수
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // processing 상태인 비디오들 조회
    const { data: processingVideos, error: fetchError } = await supabaseAdmin
      .from('gen_videos')
      .select('*')
      .in('generation_status', ['pending', 'processing'])
      .not('request_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5); // 비디오는 더 무거우므로 한 번에 5개까지만 처리

    if (fetchError) {
      throw fetchError;
    }

    if (!processingVideos || processingVideos.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No videos to process',
          processed: 0
        })
      };
    }

    console.log(`Processing ${processingVideos.length} videos`);
    
    // 각 비디오의 상태 확인
    const results = await Promise.allSettled(
      processingVideos.map(async (video) => {
        if (!video.metadata?.status_url) {
          return { id: video.id, status: 'no_status_url' };
        }

        try {
          // FAL AI 상태 확인
          const statusResponse = await fetch(video.metadata.status_url, {
            headers: {
              'Authorization': `Key ${process.env.FAL_API_KEY}`
            }
          });

          if (!statusResponse.ok) {
            throw new Error('Failed to check FAL AI status');
          }

          const statusData = await statusResponse.json();
          console.log(`Status for video ${video.id}:`, statusData);
          
          // FAL AI 응답 구조 확인 및 처리 (대소문자 모두 처리)
          const isCompleted = statusData.video || statusData.output || statusData.video_url || 
                            (statusData.status && (statusData.status === 'completed' || statusData.status === 'COMPLETED'));
          
          // 완료된 경우
          if (isCompleted) {
            // 비디오 데이터 가져오기
            let resultData = statusData;
            
            // COMPLETED 상태이지만 비디오 데이터가 없는 경우 response_url에서 가져오기
            if ((statusData.status === 'COMPLETED' || statusData.status === 'completed') && 
                !statusData.video && !statusData.output && !statusData.video_url && 
                statusData.response_url) {
              console.log('Fetching result from response_url:', statusData.response_url);
              const resultResponse = await fetch(statusData.response_url, {
                headers: {
                  'Authorization': `Key ${process.env.FAL_API_KEY}`
                }
              });
              
              if (resultResponse.ok) {
                resultData = await resultResponse.json();
                console.log('Result data from response_url:', resultData);
              } else {
                console.error('Failed to fetch result from response_url:', resultResponse.status);
                throw new Error('Failed to fetch video result');
              }
            }
            
            // 다양한 응답 형식 처리
            let videoUrl = null;
            let thumbnailUrl = null;
            let duration = null;
            let fps = null;
            let resolution = null;
            
            if (resultData.video) {
              videoUrl = resultData.video.url || resultData.video;
              thumbnailUrl = resultData.video.thumbnail_url || resultData.thumbnail;
              duration = resultData.video.duration || resultData.duration;
              fps = resultData.video.fps || resultData.fps;
              resolution = resultData.video.resolution || resultData.resolution;
            } else if (resultData.output) {
              videoUrl = resultData.output.url || resultData.output;
              thumbnailUrl = resultData.output.thumbnail || resultData.thumbnail;
              duration = resultData.output.duration;
              fps = resultData.output.fps;
              resolution = resultData.output.resolution;
            } else if (resultData.video_url) {
              videoUrl = resultData.video_url;
              thumbnailUrl = resultData.thumbnail_url;
              duration = resultData.duration;
              fps = resultData.fps;
              resolution = resultData.resolution;
            }
            
            if (!videoUrl) {
              console.error('No video URL found in response:', statusData);
              throw new Error('No video URL in response');
            }
            
            // 비디오를 Supabase Storage에 저장
            const videoResponse = await fetch(videoUrl);
            const videoBlob = await videoResponse.blob();
            const videoBuffer = await videoBlob.arrayBuffer();
            const videoData = Buffer.from(videoBuffer);
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 9);
            const fileName = `${video.project_id}/${video.video_type}/${timestamp}-${randomId}.mp4`;
            
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

            // 썸네일 처리 (있는 경우)
            let storageThumbnailUrl = null;
            if (thumbnailUrl) {
              try {
                const thumbResponse = await fetch(thumbnailUrl);
                const thumbBlob = await thumbResponse.blob();
                const thumbBuffer = await thumbBlob.arrayBuffer();
                const thumbData = Buffer.from(thumbBuffer);
                
                const thumbFileName = `${video.project_id}/thumbnails/${timestamp}-${randomId}.jpg`;
                
                const { data: thumbUpload, error: thumbError } = await supabaseAdmin
                  .storage
                  .from('gen-videos')
                  .upload(thumbFileName, thumbData, {
                    contentType: 'image/jpeg',
                    upsert: false
                  });

                if (!thumbError) {
                  const { data: { publicUrl: thumbPublicUrl } } = supabaseAdmin
                    .storage
                    .from('gen-videos')
                    .getPublicUrl(thumbFileName);
                  storageThumbnailUrl = thumbPublicUrl;
                }
              } catch (thumbError) {
                console.error('Thumbnail processing error:', thumbError);
              }
            }

            // DB 업데이트
            await supabaseAdmin
              .from('gen_videos')
              .update({
                generation_status: 'completed',
                result_video_url: videoUrl,
                storage_video_url: publicUrl,
                thumbnail_url: storageThumbnailUrl || thumbnailUrl,
                duration_seconds: duration,
                fps: fps,
                resolution: resolution,
                completed_at: new Date().toISOString(),
                metadata: {
                  ...video.metadata,
                  completed_response: statusData
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', video.id);

            return { id: video.id, status: 'completed' };
          }
          
          // 실패한 경우 (대소문자 모두 처리)
          const isFailed = statusData.status === 'failed' || 
                          statusData.status === 'FAILED' ||
                          statusData.status === 'error' ||
                          statusData.status === 'ERROR' ||
                          statusData.error;
          
          if (isFailed) {
            await supabaseAdmin
              .from('gen_videos')
              .update({
                generation_status: 'failed',
                metadata: {
                  ...video.metadata,
                  error: statusData.error || statusData.message || 'Generation failed',
                  failed_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', video.id);

            return { id: video.id, status: 'failed' };
          }
          
          // 아직 처리 중 (대소문자 모두 처리)
          const isProcessing = statusData.status === 'IN_QUEUE' || 
                             statusData.status === 'IN_PROGRESS' ||
                             statusData.status === 'processing' ||
                             statusData.status === 'pending' ||
                             statusData.status === 'PROCESSING' ||
                             statusData.status === 'PENDING' ||
                             statusData.status === 'QUEUED';
          
          if (isProcessing) {
            // processing 상태가 너무 오래되면 타임아웃 처리 (10분)
            const createdAt = new Date(video.created_at);
            const now = new Date();
            const diffMinutes = (now - createdAt) / 1000 / 60;
            
            if (diffMinutes > 10) {
              await supabaseAdmin
                .from('gen_videos')
                .update({
                  generation_status: 'failed',
                  metadata: {
                    ...video.metadata,
                    error: 'Generation timeout after 10 minutes',
                    timeout_at: new Date().toISOString()
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', video.id);
              
              return { id: video.id, status: 'timeout' };
            }
            
            return { id: video.id, status: 'processing' };
          }
          
          // 알 수 없는 상태 (디버깅용 로그만)
          console.log(`Unhandled status for video ${video.id}: ${statusData.status}`);
          return { id: video.id, status: 'unknown' };
          
        } catch (error) {
          console.error(`Error processing video ${video.id}:`, error);
          
          // 422 에러 처리 (Unprocessable Entity - 요청 검증 실패)
          if (error.status === 422 || error.message?.includes('422')) {
            console.log(`🚫 422 validation error for video ${video.id} - prompt: ${video.prompt?.substring(0, 50)}...`);
            
            await supabaseAdmin
              .from('ai_videos')
              .update({
                generation_status: 'failed',
                error_message: 'Invalid request parameters (422)',
                metadata: {
                  ...video.metadata,
                  error: 'Invalid request parameters (422)',
                  error_details: error.message || 'Request validation failed',
                  failed_at: new Date().toISOString()
                },
                completed_at: new Date().toISOString()
              })
              .eq('id', video.id);
              
            return { id: video.id, status: 'failed', error: '422 validation error' };
          }
          
          return { id: video.id, status: 'error', error: error.message };
        }
      })
    );

    // 결과 집계
    const summary = {
      total: results.length,
      completed: results.filter(r => r.value?.status === 'completed').length,
      failed: results.filter(r => r.value?.status === 'failed' || r.value?.status === 'timeout').length,
      processing: results.filter(r => r.value?.status === 'processing').length,
      unknown: results.filter(r => r.value?.status === 'unknown').length,
      errors: results.filter(r => r.status === 'rejected' || r.value?.status === 'error').length,
      pending: 0
    };
    
    console.log('Processing summary:', summary);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        summary,
        results: results.map(r => r.value || { error: r.reason?.message })
      })
    };

  } catch (error) {
    console.error('Error in processVideoQueue:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};