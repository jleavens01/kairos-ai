// 백업 시스템 모니터링 및 알림
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 백업 상태 대시보드
export async function getBackupStatus() {
  try {
    console.log('📊 백업 상태 분석 중...');
    
    // 이미지 백업 현황
    const { data: imageStats } = await supabase
      .from('gen_images')
      .select(`
        backup_status,
        file_size,
        created_at,
        backed_up_at
      `)
      .not('storage_image_url', 'is', null);
    
    // 비디오 백업 현황
    const { data: videoStats } = await supabase
      .from('gen_videos')
      .select(`
        backup_status,
        file_size,
        upscale_file_size,
        upscale_video_url,
        created_at,
        backed_up_at
      `)
      .or('storage_video_url.not.is.null,upscale_video_url.not.is.null');
    
    // 통계 계산
    const stats = {
      images: analyzeFileStats(imageStats, 'image'),
      videos: analyzeFileStats(videoStats.filter(v => !v.upscale_video_url), 'video'),
      upscale: analyzeFileStats(videoStats.filter(v => v.upscale_video_url), 'upscale'),
      timestamp: new Date().toISOString()
    };
    
    // 전체 요약
    stats.summary = {
      total_files: stats.images.total + stats.videos.total + stats.upscale.total,
      backed_up: stats.images.backed_up + stats.videos.backed_up + stats.upscale.backed_up,
      pending: stats.images.pending + stats.videos.pending + stats.upscale.pending,
      failed: stats.images.failed + stats.videos.failed + stats.upscale.failed,
      backup_percentage: Math.round(
        ((stats.images.backed_up + stats.videos.backed_up + stats.upscale.backed_up) / 
         (stats.images.total + stats.videos.total + stats.upscale.total)) * 100
      )
    };
    
    return stats;
    
  } catch (error) {
    console.error('❌ 백업 상태 조회 실패:', error);
    throw error;
  }
}

function analyzeFileStats(files, type) {
  const total = files.length;
  const backed_up = files.filter(f => f.backup_status === 'completed').length;
  const failed = files.filter(f => f.backup_status === 'failed').length;
  const pending = total - backed_up - failed;
  
  const total_size = files.reduce((sum, f) => {
    const size = type === 'upscale' ? f.upscale_file_size : f.file_size;
    return sum + (size || 0);
  }, 0);
  
  const backed_up_size = files
    .filter(f => f.backup_status === 'completed')
    .reduce((sum, f) => {
      const size = type === 'upscale' ? f.upscale_file_size : f.file_size;
      return sum + (size || 0);
    }, 0);
  
  return {
    type,
    total,
    backed_up,
    failed,
    pending,
    backup_percentage: total > 0 ? Math.round((backed_up / total) * 100) : 0,
    total_size_mb: Math.round(total_size / 1024 / 1024),
    backed_up_size_mb: Math.round(backed_up_size / 1024 / 1024),
    avg_file_size_mb: total > 0 ? Math.round((total_size / total) / 1024 / 1024) : 0
  };
}

// URL 가용성 체크
export async function checkUrlAvailability(limit = 20) {
  console.log('🔍 URL 가용성 체크 중...');
  
  // 최근 백업된 파일들 중 샘플 체크
  const { data: recentBackups } = await supabase
    .from('gen_videos')
    .select(`
      id,
      storage_video_url,
      backup_storage_url,
      backup_status,
      created_at
    `)
    .not('backup_storage_url', 'is', null)
    .order('backed_up_at', { ascending: false })
    .limit(limit);
  
  const results = [];
  
  for (const file of recentBackups || []) {
    const result = {
      id: file.id,
      original_available: false,
      backup_available: false,
      checked_at: new Date().toISOString()
    };
    
    try {
      // 원본 URL 체크
      if (file.storage_video_url) {
        const originalRes = await fetch(file.storage_video_url, { 
          method: 'HEAD',
          timeout: 5000 
        });
        result.original_available = originalRes.ok;
      }
      
      // 백업 URL 체크  
      if (file.backup_storage_url) {
        const backupRes = await fetch(file.backup_storage_url, { 
          method: 'HEAD',
          timeout: 5000 
        });
        result.backup_available = backupRes.ok;
      }
      
    } catch (error) {
      result.error = error.message;
    }
    
    results.push(result);
    
    // API 부하 방지
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const summary = {
    total_checked: results.length,
    original_working: results.filter(r => r.original_available).length,
    backup_working: results.filter(r => r.backup_available).length,
    both_working: results.filter(r => r.original_available && r.backup_available).length,
    backup_needed: results.filter(r => !r.original_available && r.backup_available).length,
    both_failed: results.filter(r => !r.original_available && !r.backup_available).length
  };
  
  return {
    summary,
    details: results,
    timestamp: new Date().toISOString()
  };
}

// 백업 필요성 알림
export function generateBackupAlert(stats) {
  const alerts = [];
  
  // 백업률이 낮은 경우
  if (stats.summary.backup_percentage < 90) {
    alerts.push({
      level: 'warning',
      message: `전체 백업률이 ${stats.summary.backup_percentage}%로 낮습니다. (${stats.summary.pending}개 파일 대기 중)`
    });
  }
  
  // 실패가 많은 경우
  if (stats.summary.failed > 10) {
    alerts.push({
      level: 'error', 
      message: `${stats.summary.failed}개 파일 백업이 실패했습니다. 원인 분석이 필요합니다.`
    });
  }
  
  // 특정 타입 백업률이 낮은 경우
  [stats.images, stats.videos, stats.upscale].forEach(typeStats => {
    if (typeStats.total > 0 && typeStats.backup_percentage < 85) {
      alerts.push({
        level: 'warning',
        message: `${typeStats.type} 백업률이 ${typeStats.backup_percentage}%로 낮습니다. (${typeStats.pending}개 대기)`
      });
    }
  });
  
  return alerts;
}