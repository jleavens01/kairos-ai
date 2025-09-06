import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (서비스 키 사용)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 파일을 Supabase Storage에 백업 (250MB 지원)
async function backupFileToSupabaseStorage(fileUrl, fileName, bucketName = 'backups-large') {
  try {
    console.log(`Backing up file: ${fileName} to Supabase Storage`);
    
    // 파일 다운로드 및 크기 체크
    console.log(`📡 Downloading: ${fileUrl}`);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    
    const fileBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    const actualFileSize = uint8Array.length;
    
    console.log(`📏 File size: ${(actualFileSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 파일 확장자에 따른 Content-Type 설정
    const getContentType = (fileName) => {
      const ext = fileName.toLowerCase().split('.').pop();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm'
      };
      return mimeTypes[ext] || 'application/octet-stream';
    };
    
    // Supabase Storage에 업로드
    const detectedContentType = getContentType(fileName);
    console.log(`🔍 File: ${fileName} → Content-Type: ${detectedContentType}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: detectedContentType,
        upsert: true // 같은 이름 파일이 있으면 덮어쓰기
      });
    
    if (error) {
      throw error;
    }
    
    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    console.log(`✅ Backup successful: ${fileName} -> ${publicUrl}`);
    return {
      success: true,
      storagePath: data.path,
      publicUrl: publicUrl,
      fileName: fileName,
      originalUrl: fileUrl,
      bucketName: bucketName,
      actualFileSize: actualFileSize // 실제 파일 크기 추가
    };
    
  } catch (error) {
    console.error(`❌ Backup failed for ${fileName}:`, error);
    return {
      success: false,
      error: error.message,
      fileName: fileName,
      originalUrl: fileUrl
    };
  }
}

// 업스케일 비디오 백업 (우선순위)
async function backupUpscaleVideos(limit = 5) {
  console.log('🔍 Finding upscale videos to backup...');
  
  const { data: videos, error } = await supabase
    .from('gen_videos')
    .select('id, upscale_video_url, generation_model, created_at, upscale_file_size')
    .not('upscale_video_url', 'is', null)
    .is('backup_storage_url', null) // 아직 백업되지 않은 것만
    .order('upscale_file_size', { ascending: false }) // 큰 파일부터
    .limit(limit);
  
  if (error) {
    console.error('Error fetching upscale videos:', error);
    return { success: false, error: error.message };
  }
  
  console.log(`📦 Found ${videos.length} upscale videos to backup`);
  
  const results = [];
  for (const video of videos) {
    const fileName = `upscale/video_${video.generation_model}_${video.id}_${Date.now()}.mp4`;
    const result = await backupFileToSupabaseStorage(
      video.upscale_video_url,
      fileName,
      'backups'
    );
    
    if (result.success) {
      // DB 업데이트 - 백업 정보 및 실제 파일 크기 업데이트
      const updateData = {
        backup_storage_url: result.publicUrl,
        backup_storage_path: result.storagePath,
        backed_up_at: new Date().toISOString(),
        backup_status: 'completed'
      };
      
      // 기존 파일 크기가 없거나 다르면 업데이트
      if (!video.upscale_file_size || result.actualFileSize) {
        updateData.upscale_file_size = result.actualFileSize;
        console.log(`📊 Updated upscale file size: ${(result.actualFileSize / 1024 / 1024).toFixed(2)} MB`);
      }
      
      const { error: updateError } = await supabase
        .from('gen_videos')
        .update(updateData)
        .eq('id', video.id);
      
      if (updateError) {
        console.error(`Failed to update DB for video ${video.id}:`, updateError);
        result.dbUpdateError = updateError.message;
      }
    }
    
    results.push(result);
    
    // API 제한 방지 (Supabase는 더 관대하지만 안전하게)
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return {
    success: true,
    results,
    backed_up: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}

// 일반 비디오 백업
async function backupRegularVideos(limit = 10) {
  console.log('🔍 Finding regular videos to backup...');
  
  const { data: videos, error } = await supabase
    .from('gen_videos')
    .select('id, storage_video_url, result_video_url, generation_model, created_at, file_size')
    .not('storage_video_url', 'is', null)
    .is('backup_storage_url', null) // 아직 백업되지 않은 것만
    .order('file_size', { ascending: false }) // 큰 파일부터
    .limit(limit);
  
  if (error) {
    console.error('Error fetching regular videos:', error);
    return { success: false, error: error.message };
  }
  
  console.log(`📦 Found ${videos.length} regular videos to backup`);
  
  const results = [];
  for (const video of videos) {
    const fileName = `videos/video_${video.generation_model}_${video.id}_${Date.now()}.mp4`;
    const result = await backupFileToSupabaseStorage(
      video.storage_video_url || video.result_video_url,
      fileName,
      'backups'
    );
    
    if (result.success) {
      // DB 업데이트 - 백업 정보 및 실제 파일 크기 업데이트
      const updateData = {
        backup_storage_url: result.publicUrl,
        backup_storage_path: result.storagePath,
        backed_up_at: new Date().toISOString(),
        backup_status: 'completed'
      };
      
      // 기존 파일 크기가 없거나 다르면 업데이트
      if (!video.file_size || result.actualFileSize) {
        updateData.file_size = result.actualFileSize;
        console.log(`📊 Updated video file size: ${(result.actualFileSize / 1024 / 1024).toFixed(2)} MB`);
      }
      
      const { error: updateError } = await supabase
        .from('gen_videos')
        .update(updateData)
        .eq('id', video.id);
      
      if (updateError) {
        console.error(`Failed to update DB for video ${video.id}:`, updateError);
        result.dbUpdateError = updateError.message;
      }
    }
    
    results.push(result);
    
    // API 제한 방지
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return {
    success: true,
    results,
    backed_up: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}

// 이미지 백업
async function backupImages(limit = 20) {
  console.log('🔍 Finding images to backup...');
  
  const { data: images, error } = await supabase
    .from('gen_images')
    .select('id, storage_image_url, result_image_url, generation_model, created_at, file_size')
    .not('storage_image_url', 'is', null)
    .is('backup_storage_url', null) // 아직 백업되지 않은 것만
    .order('file_size', { ascending: false }) // 큰 파일부터
    .limit(limit);
  
  if (error) {
    console.error('Error fetching images:', error);
    return { success: false, error: error.message };
  }
  
  console.log(`📦 Found ${images.length} images to backup`);
  
  const results = [];
  for (const image of images) {
    const fileName = `images/image_${image.generation_model}_${image.id}_${Date.now()}.jpg`;
    const result = await backupFileToSupabaseStorage(
      image.storage_image_url || image.result_image_url,
      fileName,
      'backups'
    );
    
    if (result.success) {
      // DB 업데이트 - 백업 정보 및 실제 파일 크기 업데이트
      const updateData = {
        backup_storage_url: result.publicUrl,
        backup_storage_path: result.storagePath,
        backed_up_at: new Date().toISOString(),
        backup_status: 'completed'
      };
      
      // 기존 파일 크기가 없거나 다르면 업데이트
      if (!image.file_size || result.actualFileSize) {
        updateData.file_size = result.actualFileSize;
        console.log(`📊 Updated image file size: ${(result.actualFileSize / 1024).toFixed(1)} KB`);
      }
      
      const { error: updateError } = await supabase
        .from('gen_images')
        .update(updateData)
        .eq('id', image.id);
      
      if (updateError) {
        console.error(`Failed to update DB for image ${image.id}:`, updateError);
        result.dbUpdateError = updateError.message;
      }
    }
    
    results.push(result);
    
    // API 제한 방지
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return {
    success: true,
    results,
    backed_up: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  try {
    const { type = 'upscale', limit = 5 } = JSON.parse(event.body || '{}');
    
    console.log('=== SUPABASE STORAGE BACKUP START ===');
    console.log(`Type: ${type}, Limit: ${limit}`);
    
    let results;
    
    switch (type) {
      case 'upscale':
        results = await backupUpscaleVideos(limit);
        break;
      case 'regular':
        results = await backupRegularVideos(limit);
        break;
      case 'images':
        results = await backupImages(limit);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: 'Invalid backup type. Use "upscale", "regular", or "images"' 
          })
        };
    }
    
    const summary = {
      success: true,
      message: `Supabase Storage backup completed (${type})`,
      type,
      backed_up: results.backed_up,
      failed: results.failed,
      details: results.results,
      timestamp: new Date().toISOString()
    };
    
    console.log('=== BACKUP SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(summary)
    };
    
  } catch (error) {
    console.error('Backup error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Backup failed'
      })
    };
  }
};