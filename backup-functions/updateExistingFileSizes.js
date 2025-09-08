import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (서비스 키 사용)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 파일 사이즈 체크 함수
async function getFileSize(url) {
  try {
    console.log(`Checking file size for: ${url}`);
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      console.warn(`HEAD request failed for ${url}: ${response.status}`);
      // HEAD 실패 시 GET으로 재시도
      const fullResponse = await fetch(url);
      if (!fullResponse.ok) {
        throw new Error(`HTTP error! status: ${fullResponse.status}`);
      }
      const arrayBuffer = await fullResponse.arrayBuffer();
      return arrayBuffer.byteLength;
    }
    
    const contentLength = response.headers.get('content-length');
    
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    
    // Content-Length가 없는 경우 실제 다운로드로 크기 확인
    const fullResponse = await fetch(url);
    if (!fullResponse.ok) {
      throw new Error(`HTTP error! status: ${fullResponse.status}`);
    }
    
    const arrayBuffer = await fullResponse.arrayBuffer();
    return arrayBuffer.byteLength;
    
  } catch (error) {
    console.error(`Error getting file size for ${url}:`, error);
    return null;
  }
}

// 이미지 메타데이터 체크 함수 (브라우저 환경이 아니므로 다른 방식 필요)
async function getImageMetadata(url) {
  try {
    // 서버사이드에서는 이미지 크기를 직접 파싱하기 어려우므로 
    // 일단 null을 반환하고 나중에 클라이언트에서 처리하도록 함
    return { width: null, height: null };
  } catch (error) {
    return { width: null, height: null };
  }
}

// 배치 업데이트 함수
async function updateBatchFileSizes(items, tableName, urlField) {
  let updated = 0;
  let failed = 0;
  
  console.log(`Processing ${items.length} ${tableName} records...`);
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const url = item[urlField];
    
    if (!url) {
      console.log(`${tableName} ${item.id}: No URL found`);
      continue;
    }
    
    if (item.file_size) {
      console.log(`${tableName} ${item.id}: File size already exists (${item.file_size})`);
      continue;
    }
    
    try {
      console.log(`[${i + 1}/${items.length}] Processing ${tableName} ${item.id}...`);
      
      const fileSize = await getFileSize(url);
      let metadata = {};
      
      if (tableName === 'gen_images') {
        metadata = await getImageMetadata(url);
      }
      
      if (fileSize) {
        const updateData = {
          file_size: fileSize,
          updated_at: new Date().toISOString()
        };
        
        // 이미지인 경우 width, height도 업데이트
        if (tableName === 'gen_images') {
          updateData.width = metadata.width;
          updateData.height = metadata.height;
        }
        
        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', item.id);
        
        if (error) {
          console.error(`Failed to update ${tableName} ${item.id}:`, error);
          failed++;
        } else {
          console.log(`✅ Updated ${tableName} ${item.id}: ${fileSize} bytes`);
          updated++;
        }
      } else {
        console.warn(`❌ Failed to get file size for ${tableName} ${item.id}`);
        failed++;
      }
      
      // API 제한을 피하기 위해 잠시 대기 (더 짧게)
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error) {
      console.error(`Error processing ${tableName} ${item.id}:`, error);
      failed++;
    }
  }
  
  return { updated, failed };
}

export const handler = async (event) => {
  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  try {
    const { limit = 50, offset = 0, table = 'both' } = JSON.parse(event.body || '{}');
    
    console.log('=== STARTING FILE SIZE UPDATE ===');
    console.log(`Limit: ${limit}, Offset: ${offset}, Table: ${table}`);
    
    const results = {
      images: { updated: 0, failed: 0, total: 0 },
      videos: { updated: 0, failed: 0, total: 0 }
    };
    
    // 이미지 처리
    if (table === 'both' || table === 'images') {
      console.log('\n--- PROCESSING IMAGES ---');
      
      const { data: images, error: imageError } = await supabase
        .from('gen_images')
        .select('id, storage_image_url, result_image_url, file_size, width, height')
        .or('file_size.is.null,file_size.eq.0')
        .not('storage_image_url', 'is', null)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (imageError) {
        console.error('Error fetching images:', imageError);
      } else {
        results.images.total = images.length;
        const imageResults = await updateBatchFileSizes(
          images, 
          'gen_images', 
          'storage_image_url'
        );
        results.images.updated = imageResults.updated;
        results.images.failed = imageResults.failed;
      }
    }
    
    // 비디오 처리
    if (table === 'both' || table === 'videos') {
      console.log('\n--- PROCESSING VIDEOS ---');
      
      const { data: videos, error: videoError } = await supabase
        .from('gen_videos')
        .select('id, storage_video_url, result_video_url, file_size, upscale_file_size, upscale_video_url')
        .or('file_size.is.null,file_size.eq.0')
        .not('storage_video_url', 'is', null)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (videoError) {
        console.error('Error fetching videos:', videoError);
      } else {
        results.videos.total = videos.length;
        const videoResults = await updateBatchFileSizes(
          videos, 
          'gen_videos', 
          'storage_video_url'
        );
        results.videos.updated = videoResults.updated;
        results.videos.failed = videoResults.failed;
        
        // 업스케일 비디오도 처리
        const upscaleVideos = videos.filter(v => v.upscale_video_url && !v.upscale_file_size);
        if (upscaleVideos.length > 0) {
          console.log('\n--- PROCESSING UPSCALE VIDEOS ---');
          for (const video of upscaleVideos) {
            try {
              const upscaleSize = await getFileSize(video.upscale_video_url);
              if (upscaleSize) {
                const { error } = await supabase
                  .from('gen_videos')
                  .update({ 
                    upscale_file_size: upscaleSize,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', video.id);
                
                if (!error) {
                  console.log(`✅ Updated upscale size for video ${video.id}: ${upscaleSize} bytes`);
                }
              }
            } catch (error) {
              console.error(`Error updating upscale size for video ${video.id}:`, error);
            }
          }
        }
      }
    }
    
    const summary = {
      success: true,
      message: 'File size update completed',
      results,
      processed: {
        images: results.images.total,
        videos: results.videos.total
      },
      updated: {
        images: results.images.updated,
        videos: results.videos.updated,
        total: results.images.updated + results.videos.updated
      },
      failed: {
        images: results.images.failed,
        videos: results.videos.failed,
        total: results.images.failed + results.videos.failed
      }
    };
    
    console.log('\n=== UPDATE SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(summary)
    };
    
  } catch (error) {
    console.error('File size update error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'File size update failed'
      })
    };
  }
};