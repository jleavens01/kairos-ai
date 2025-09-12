// SeedDance Pro 디버깅 함수
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 최근 24시간 내 SeedDance Pro 작업들 조회
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: videos, error } = await supabase
      .from('gen_videos')
      .select('*')
      .eq('generation_model', 'seedance-v1-pro')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`Found ${videos?.length || 0} SeedDance Pro videos in the last 24 hours`);

    const result = {
      total: videos?.length || 0,
      by_status: {},
      processing_videos: [],
      completed_videos: [],
      failed_videos: [],
      details: []
    };

    if (videos) {
      // 상태별 분류
      videos.forEach(video => {
        const status = video.generation_status;
        result.by_status[status] = (result.by_status[status] || 0) + 1;
        
        const videoInfo = {
          id: video.id,
          request_id: video.request_id,
          generation_status: video.generation_status,
          created_at: video.created_at,
          updated_at: video.updated_at,
          prompt: video.prompt_used?.substring(0, 100) + '...',
          model_parameters: video.model_parameters,
          result_video_url: video.result_video_url,
          storage_video_url: video.storage_video_url,
          file_size: video.file_size,
          error_message: video.error_message,
          metadata: video.metadata
        };
        
        result.details.push(videoInfo);
        
        if (status === 'processing' || status === 'pending') {
          result.processing_videos.push({
            id: video.id,
            request_id: video.request_id,
            created_at: video.created_at,
            updated_at: video.updated_at,
            time_elapsed_minutes: Math.round((Date.now() - new Date(video.created_at).getTime()) / 60000)
          });
        } else if (status === 'completed') {
          result.completed_videos.push({
            id: video.id,
            request_id: video.request_id,
            created_at: video.created_at,
            result_video_url: video.result_video_url,
            file_size: video.file_size
          });
        } else if (status === 'failed') {
          result.failed_videos.push({
            id: video.id,
            request_id: video.request_id,
            created_at: video.created_at,
            error_message: video.error_message
          });
        }
      });
    }

    console.log('SeedDance Pro Status Summary:', result.by_status);
    console.log('Processing/Pending videos:', result.processing_videos.length);
    console.log('Completed videos:', result.completed_videos.length);
    console.log('Failed videos:', result.failed_videos.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Error in debugSeedancePro:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};