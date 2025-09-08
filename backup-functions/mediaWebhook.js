// 이미지/비디오 생성 완료 웹훅을 처리하는 함수
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST 요청만 처리
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const webhookData = JSON.parse(event.body);
    
    console.log('Webhook received:', webhookData);

    // FAL AI 웹훅 데이터 처리
    if (webhookData.request_id) {
      // 비디오 웹훅 처리
      const isVideo = webhookData.video || webhookData.output?.url || webhookData.video_url;
      
      if (isVideo) {
        return await handleVideoWebhook(supabase, webhookData);
      } else {
        // 이미지 웹훅 처리
        return await handleImageWebhook(supabase, webhookData);
      }
    }
    
    // Google Veo 웹훅 처리 (향후 구현 필요 시)
    if (webhookData.veo_id) {
      return await handleVeoWebhook(supabase, webhookData);
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Unknown webhook format' })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};

async function handleVideoWebhook(supabase, webhookData) {
  try {
    // request_id로 비디오 찾기
    const { data: video, error: findError } = await supabase
      .from('gen_videos')
      .select('*')
      .eq('request_id', webhookData.request_id)
      .single();

    if (findError || !video) {
      console.error('Video not found for request_id:', webhookData.request_id);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Video not found' })
      };
    }

    // 비디오 URL 추출
    let videoUrl = null;
    let thumbnailUrl = null;
    let duration = null;
    
    if (webhookData.video) {
      videoUrl = webhookData.video.url || webhookData.video;
      thumbnailUrl = webhookData.video.thumbnail_url || webhookData.thumbnail;
      duration = webhookData.video.duration;
    } else if (webhookData.output) {
      videoUrl = webhookData.output.url || webhookData.output;
      thumbnailUrl = webhookData.output.thumbnail;
      duration = webhookData.output.duration;
    } else if (webhookData.video_url) {
      videoUrl = webhookData.video_url;
      thumbnailUrl = webhookData.thumbnail_url;
      duration = webhookData.duration;
    }

    if (!videoUrl) {
      throw new Error('No video URL in webhook data');
    }

    // Storage에 비디오 저장
    const videoResponse = await fetch(videoUrl);
    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();
    const videoData = Buffer.from(videoBuffer);
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const videoType = video.video_type || 'scene';
    const fileName = `gen-videos/${video.project_id}/${videoType}/${timestamp}_${randomId}.mp4`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('projects')
      .upload(fileName, videoData, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Storage URL 생성
    const { data: { publicUrl } } = supabase
      .storage
      .from('projects')
      .getPublicUrl(fileName);

    // 썸네일 처리
    let storageThumbnailUrl = null;
    if (thumbnailUrl) {
      try {
        const thumbResponse = await fetch(thumbnailUrl);
        const thumbBlob = await thumbResponse.blob();
        const thumbBuffer = await thumbBlob.arrayBuffer();
        const thumbData = Buffer.from(thumbBuffer);
        
        const thumbFileName = `gen-videos/${video.project_id}/thumbnails/${timestamp}_${randomId}.jpg`;
        
        const { data: thumbUpload, error: thumbError } = await supabase
          .storage
          .from('projects')
          .upload(thumbFileName, thumbData, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (!thumbError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase
            .storage
            .from('projects')
            .getPublicUrl(thumbFileName);
          storageThumbnailUrl = thumbPublicUrl;
        }
      } catch (thumbError) {
        console.error('Thumbnail processing error:', thumbError);
      }
    }

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('gen_videos')
      .update({
        generation_status: 'completed',
        result_video_url: videoUrl,
        storage_video_url: publicUrl,
        thumbnail_url: storageThumbnailUrl || thumbnailUrl,
        duration_seconds: duration,
        completed_at: new Date().toISOString(),
        metadata: {
          ...video.metadata,
          webhook_received_at: new Date().toISOString(),
          webhook_data: webhookData
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', video.id);

    if (updateError) {
      throw updateError;
    }

    // Realtime 브로드캐스트로 클라이언트에 알림
    await supabase
      .channel('media-updates')
      .send({
        type: 'broadcast',
        event: 'video-completed',
        payload: {
          project_id: video.project_id,
          video_id: video.id,
          status: 'completed'
        }
      });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Video webhook processed',
        video_id: video.id 
      })
    };

  } catch (error) {
    console.error('Video webhook error:', error);
    throw error;
  }
}

async function handleImageWebhook(supabase, webhookData) {
  try {
    // request_id로 이미지 찾기
    const { data: image, error: findError } = await supabase
      .from('gen_images')
      .select('*')
      .eq('request_id', webhookData.request_id)
      .single();

    if (findError || !image) {
      console.error('Image not found for request_id:', webhookData.request_id);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Image not found' })
      };
    }

    // 이미지 URL 추출
    let imageUrl = null;
    
    if (webhookData.images && webhookData.images.length > 0) {
      imageUrl = webhookData.images[0].url;
    } else if (webhookData.image) {
      imageUrl = webhookData.image.url || webhookData.image;
    } else if (webhookData.output) {
      imageUrl = webhookData.output.url || webhookData.output;
    }

    if (!imageUrl) {
      throw new Error('No image URL in webhook data');
    }

    // Storage에 이미지 저장
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageData = Buffer.from(imageBuffer);
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const category = image.category || 'general';
    const fileName = `gen-images/${image.project_id}/${category}/${timestamp}_${randomId}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('projects')
      .upload(fileName, imageData, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Storage URL 생성
    const { data: { publicUrl } } = supabase
      .storage
      .from('projects')
      .getPublicUrl(fileName);

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('gen_images')
      .update({
        generation_status: 'completed',
        result_image_url: imageUrl,
        storage_image_url: publicUrl,
        completed_at: new Date().toISOString(),
        metadata: {
          ...image.metadata,
          webhook_received_at: new Date().toISOString(),
          webhook_data: webhookData
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', image.id);

    if (updateError) {
      throw updateError;
    }

    // Realtime 브로드캐스트로 클라이언트에 알림
    await supabase
      .channel('media-updates')
      .send({
        type: 'broadcast',
        event: 'image-completed',
        payload: {
          project_id: image.project_id,
          image_id: image.id,
          status: 'completed'
        }
      });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Image webhook processed',
        image_id: image.id 
      })
    };

  } catch (error) {
    console.error('Image webhook error:', error);
    throw error;
  }
}

async function handleVeoWebhook(supabase, webhookData) {
  // Google Veo 웹훅 처리 (향후 구현)
  console.log('Veo webhook received:', webhookData);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      success: true, 
      message: 'Veo webhook acknowledged (not implemented yet)' 
    })
  };
}