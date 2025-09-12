// Processing 상태 디버깅 함수
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
    const result = {
      images: {
        processing: [],
        topaz_upscale_processing: [],
        total_processing: 0
      },
      videos: {
        processing: [],
        upscale_processing: [],
        total_processing: 0
      },
      timestamp: new Date().toISOString()
    };

    // 1. Processing 상태인 이미지들 조회
    const { data: processingImages, error: imgError } = await supabase
      .from('gen_images')
      .select('id, request_id, upscale_id, generation_status, upscale_status, created_at, updated_at, generation_model, upscale_settings')
      .eq('generation_status', 'processing')
      .order('created_at', { ascending: false })
      .limit(20);

    if (imgError) {
      console.error('Error fetching processing images:', imgError);
    } else if (processingImages) {
      result.images.processing = processingImages;
      result.images.total_processing = processingImages.length;
    }

    // 2. Upscale processing 상태인 이미지들 조회
    const { data: upscaleImages, error: upscaleImgError } = await supabase
      .from('gen_images')
      .select('id, request_id, upscale_id, generation_status, upscale_status, created_at, updated_at, upscale_settings')
      .eq('upscale_status', 'processing')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (upscaleImgError) {
      console.error('Error fetching upscale processing images:', upscaleImgError);
    } else if (upscaleImages) {
      result.images.topaz_upscale_processing = upscaleImages;
    }

    // 3. Processing 상태인 비디오들 조회
    const { data: processingVideos, error: vidError } = await supabase
      .from('gen_videos')
      .select('id, request_id, generation_status, upscale_status, upscale_id, created_at, updated_at, generation_model')
      .eq('generation_status', 'processing')
      .order('created_at', { ascending: false })
      .limit(20);

    if (vidError) {
      console.error('Error fetching processing videos:', vidError);
    } else if (processingVideos) {
      result.videos.processing = processingVideos;
      result.videos.total_processing = processingVideos.length;
    }

    // 4. Upscale processing 상태인 비디오들 조회
    const { data: upscaleVideos, error: upscaleVidError } = await supabase
      .from('gen_videos')
      .select('id, request_id, generation_status, upscale_status, upscale_id, created_at, updated_at')
      .eq('upscale_status', 'processing')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (upscaleVidError) {
      console.error('Error fetching upscale processing videos:', upscaleVidError);
    } else if (upscaleVideos) {
      result.videos.upscale_processing = upscaleVideos;
    }

    // 5. 시간 경과 계산
    const now = new Date();
    result.images.processing = result.images.processing.map(img => ({
      ...img,
      minutes_elapsed: Math.floor((now - new Date(img.created_at)) / (1000 * 60))
    }));
    
    result.images.topaz_upscale_processing = result.images.topaz_upscale_processing.map(img => ({
      ...img,
      minutes_elapsed: Math.floor((now - new Date(img.updated_at)) / (1000 * 60))
    }));

    result.videos.processing = result.videos.processing.map(vid => ({
      ...vid,
      minutes_elapsed: Math.floor((now - new Date(vid.created_at)) / (1000 * 60))
    }));

    result.videos.upscale_processing = result.videos.upscale_processing.map(vid => ({
      ...vid,
      minutes_elapsed: Math.floor((now - new Date(vid.updated_at)) / (1000 * 60))
    }));

    console.log('Processing Status Summary:');
    console.log(`- Images in processing: ${result.images.total_processing}`);
    console.log(`- Images in topaz upscale: ${result.images.topaz_upscale_processing.length}`);
    console.log(`- Videos in processing: ${result.videos.total_processing}`);
    console.log(`- Videos in upscale: ${result.videos.upscale_processing.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Error in debugProcessingStatus:', error);
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