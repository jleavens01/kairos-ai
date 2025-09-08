import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import stream from 'stream';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Google Drive API 설정
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_DRIVE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// 파일을 Google Drive에 백업
async function backupFileToGoogleDrive(fileUrl, fileName, folderId) {
  try {
    console.log(`Backing up file: ${fileName}`);
    
    // 파일 다운로드
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    
    const fileBuffer = await response.arrayBuffer();
    const readable = new stream.Readable();
    readable.push(Buffer.from(fileBuffer));
    readable.push(null);
    
    // Google Drive Shared Drive에 업로드
    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: 'application/octet-stream',
        body: readable,
      },
    });
    
    // 파일을 공개적으로 접근 가능하게 설정
    await drive.permissions.create({
      fileId: driveResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    // 공개 URL 생성
    const publicUrl = `https://drive.google.com/uc?id=${driveResponse.data.id}`;
    
    console.log(`✅ Backup successful: ${fileName} -> ${publicUrl}`);
    return {
      success: true,
      driveFileId: driveResponse.data.id,
      publicUrl: publicUrl,
      fileName: fileName,
      originalUrl: fileUrl
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
async function backupUpscaleVideos(limit = 10) {
  console.log('🔍 Finding upscale videos to backup...');
  
  const { data: videos, error } = await supabase
    .from('gen_videos')
    .select('id, upscale_video_url, generation_model, created_at, upscale_file_size')
    .not('upscale_video_url', 'is', null)
    .is('backup_drive_url', null) // 아직 백업되지 않은 것만
    .order('upscale_file_size', { ascending: false }) // 큰 파일부터
    .limit(limit); // 매개변수로 제한
  
  if (error) {
    console.error('Error fetching upscale videos:', error);
    return { success: false, error: error.message };
  }
  
  console.log(`📦 Found ${videos.length} upscale videos to backup`);
  
  const results = [];
  for (const video of videos) {
    const fileName = `upscale/video_${video.generation_model}_${video.id}_${Date.now()}.mp4`;
    const result = await backupFileToGoogleDrive(
      video.upscale_video_url,
      fileName,
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );
    
    if (result.success) {
      // DB 업데이트
      const { error: updateError } = await supabase
        .from('gen_videos')
        .update({
          backup_drive_url: result.publicUrl,
          backup_drive_file_id: result.driveFileId,
          backed_up_at: new Date().toISOString(),
          backup_status: 'completed'
        })
        .eq('id', video.id);
      
      if (updateError) {
        console.error(`Failed to update DB for video ${video.id}:`, updateError);
      }
    }
    
    results.push(result);
    
    // API 제한 방지
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return {
    success: true,
    results,
    backed_up: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}

// 일반 비디오 백업
async function backupRegularVideos(limit = 20) {
  console.log('🔍 Finding regular videos to backup...');
  
  const { data: videos, error } = await supabase
    .from('gen_videos')
    .select('id, storage_video_url, result_video_url, generation_model, created_at, file_size')
    .not('storage_video_url', 'is', null)
    .is('backup_drive_url', null) // 아직 백업되지 않은 것만
    .order('file_size', { ascending: false }) // 큰 파일부터
    .limit(limit); // 매개변수로 제한
  
  if (error) {
    console.error('Error fetching regular videos:', error);
    return { success: false, error: error.message };
  }
  
  console.log(`📦 Found ${videos.length} regular videos to backup`);
  
  const results = [];
  for (const video of videos) {
    const fileName = `videos/video_${video.generation_model}_${video.id}_${Date.now()}.mp4`;
    const result = await backupFileToGoogleDrive(
      video.storage_video_url || video.result_video_url,
      fileName,
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );
    
    if (result.success) {
      // DB 업데이트
      const { error: updateError } = await supabase
        .from('gen_videos')
        .update({
          backup_drive_url: result.publicUrl,
          backup_drive_file_id: result.driveFileId,
          backed_up_at: new Date().toISOString(),
          backup_status: 'completed'
        })
        .eq('id', video.id);
      
      if (updateError) {
        console.error(`Failed to update DB for video ${video.id}:`, updateError);
      }
    }
    
    results.push(result);
    
    // API 제한 방지
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return {
    success: true,
    results,
    backed_up: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}

// 이미지 백업
async function backupImages(limit = 30) {
  console.log('🔍 Finding images to backup...');
  
  const { data: images, error } = await supabase
    .from('gen_images')
    .select('id, storage_image_url, result_image_url, generation_model, created_at, file_size')
    .not('storage_image_url', 'is', null)
    .is('backup_drive_url', null) // 아직 백업되지 않은 것만
    .order('file_size', { ascending: false }) // 큰 파일부터
    .limit(limit); // 매개변수로 제한
  
  if (error) {
    console.error('Error fetching images:', error);
    return { success: false, error: error.message };
  }
  
  console.log(`📦 Found ${images.length} images to backup`);
  
  const results = [];
  for (const image of images) {
    const fileName = `images/image_${image.generation_model}_${image.id}_${Date.now()}.jpg`;
    const result = await backupFileToGoogleDrive(
      image.storage_image_url || image.result_image_url,
      fileName,
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );
    
    if (result.success) {
      // DB 업데이트
      const { error: updateError } = await supabase
        .from('gen_images')
        .update({
          backup_drive_url: result.publicUrl,
          backup_drive_file_id: result.driveFileId,
          backed_up_at: new Date().toISOString(),
          backup_status: 'completed'
        })
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
    const { type = 'upscale', limit = 10 } = JSON.parse(event.body || '{}');
    
    console.log('=== GOOGLE DRIVE BACKUP START ===');
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
      message: `Google Drive backup completed (${type})`,
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