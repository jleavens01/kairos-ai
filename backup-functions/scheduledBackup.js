// 주기적 백업 자동화 시스템
import { createClient } from '@supabase/supabase-js';
import { handler as backupHandler } from './backupToSupabaseStorage.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 백업이 필요한 파일들 체크
async function checkPendingBackups() {
  console.log('🔍 백업 대상 파일 체크 중...');
  
  // 이미지 백업 대상
  const { data: pendingImages, error: imageError } = await supabase
    .from('gen_images')
    .select('id, storage_image_url, created_at')
    .not('storage_image_url', 'is', null)
    .is('backup_storage_url', null)
    .neq('backup_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(50);
    
  // 일반 비디오 백업 대상  
  const { data: pendingVideos, error: videoError } = await supabase
    .from('gen_videos')
    .select('id, storage_video_url, created_at')
    .not('storage_video_url', 'is', null)
    .is('backup_storage_url', null)
    .is('upscale_video_url', null) // 업스케일이 아닌 일반 비디오
    .neq('backup_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(20);
    
  // 업스케일 비디오 백업 대상
  const { data: pendingUpscale, error: upscaleError } = await supabase
    .from('gen_videos')
    .select('id, upscale_video_url, created_at')
    .not('upscale_video_url', 'is', null)
    .is('backup_storage_url', null)
    .neq('backup_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(5);
    
  const summary = {
    images: pendingImages?.length || 0,
    videos: pendingVideos?.length || 0,
    upscale: pendingUpscale?.length || 0,
    total: (pendingImages?.length || 0) + (pendingVideos?.length || 0) + (pendingUpscale?.length || 0)
  };
  
  console.log(`📊 백업 대상: 이미지 ${summary.images}개, 비디오 ${summary.videos}개, 업스케일 ${summary.upscale}개`);
  
  return summary;
}

// 자동 백업 실행
async function executeAutomaticBackup() {
  console.log('🤖 자동 백업 시작...');
  const results = [];
  
  try {
    const pending = await checkPendingBackups();
    
    if (pending.total === 0) {
      console.log('✅ 백업할 파일이 없습니다.');
      return {
        success: true,
        message: 'No files to backup',
        results: []
      };
    }
    
    // 우선순위: 이미지 > 일반 비디오 > 업스케일
    
    // 1. 이미지 백업 (10개)
    if (pending.images > 0) {
      console.log('📸 이미지 백업 실행...');
      const imageResult = await backupHandler({
        httpMethod: 'POST',
        body: JSON.stringify({ type: 'images', limit: 10 })
      });
      results.push({
        type: 'images',
        result: JSON.parse(imageResult.body)
      });
    }
    
    // 2. 일반 비디오 백업 (5개)  
    if (pending.videos > 0) {
      console.log('🎬 일반 비디오 백업 실행...');
      const videoResult = await backupHandler({
        httpMethod: 'POST', 
        body: JSON.stringify({ type: 'regular', limit: 5 })
      });
      results.push({
        type: 'regular',
        result: JSON.parse(videoResult.body)
      });
    }
    
    // 3. 업스케일 백업 (2개)
    if (pending.upscale > 0) {
      console.log('🚀 업스케일 백업 실행...');
      const upscaleResult = await backupHandler({
        httpMethod: 'POST',
        body: JSON.stringify({ type: 'upscale', limit: 2 })
      });
      results.push({
        type: 'upscale', 
        result: JSON.parse(upscaleResult.body)
      });
    }
    
    // 결과 집계
    const summary = results.reduce((acc, curr) => {
      acc.backed_up += curr.result.backed_up || 0;
      acc.failed += curr.result.failed || 0;
      return acc;
    }, { backed_up: 0, failed: 0 });
    
    console.log(`🎉 자동 백업 완료: ${summary.backed_up}개 성공, ${summary.failed}개 실패`);
    
    return {
      success: true,
      message: 'Automatic backup completed',
      summary,
      results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ 자동 백업 실패:', error);
    return {
      success: false,
      error: error.message,
      results,
      timestamp: new Date().toISOString()
    };
  }
}

// Netlify 함수 핸들러
export const handler = async (event) => {
  // Cron job 또는 수동 호출 지원
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  try {
    let result;
    
    if (event.queryStringParameters?.action === 'check') {
      // 백업 대상만 체크
      result = await checkPendingBackups();
    } else {
      // 실제 백업 실행
      result = await executeAutomaticBackup();
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Scheduled backup error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Scheduled backup failed'
      })
    };
  }
};