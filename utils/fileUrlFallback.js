// 파일 URL Fallback 시스템
// 원본 URL 실패 시 백업 URL 사용

export async function getFileWithFallback(originalUrl, backupUrl) {
  try {
    // 1. 원본 URL 시도
    console.log(`📡 Trying original URL: ${originalUrl}`);
    const originalResponse = await fetch(originalUrl, { 
      method: 'HEAD' // 헤더만 체크해서 빠르게 확인
    });
    
    if (originalResponse.ok) {
      console.log(`✅ Original URL available`);
      return {
        url: originalUrl,
        source: 'original',
        available: true
      };
    }
    
    throw new Error(`Original URL failed: ${originalResponse.status}`);
    
  } catch (originalError) {
    console.log(`❌ Original URL failed: ${originalError.message}`);
    
    if (!backupUrl) {
      throw new Error('No backup URL available');
    }
    
    try {
      // 2. 백업 URL 시도
      console.log(`🔄 Trying backup URL: ${backupUrl}`);
      const backupResponse = await fetch(backupUrl, { method: 'HEAD' });
      
      if (backupResponse.ok) {
        console.log(`✅ Backup URL available`);
        return {
          url: backupUrl,
          source: 'backup',
          available: true
        };
      }
      
      throw new Error(`Backup URL failed: ${backupResponse.status}`);
      
    } catch (backupError) {
      console.log(`❌ Backup URL failed: ${backupError.message}`);
      
      return {
        url: null,
        source: 'none',
        available: false,
        error: `Both URLs failed. Original: ${originalError.message}, Backup: ${backupError.message}`
      };
    }
  }
}

// 데이터베이스에서 파일 정보 가져오기 (백업 URL 포함)
export async function getFileInfo(fileId, fileType = 'video') {
  const tableName = fileType === 'image' ? 'gen_images' : 'gen_videos';
  const originalUrlColumn = fileType === 'image' ? 'storage_image_url' : 'storage_video_url';
  
  const { data, error } = await supabase
    .from(tableName)
    .select(`
      id,
      ${originalUrlColumn},
      backup_storage_url,
      backup_status,
      file_size,
      backed_up_at
    `)
    .eq('id', fileId)
    .single();
    
  if (error) {
    throw new Error(`Failed to get file info: ${error.message}`);
  }
  
  return {
    id: data.id,
    originalUrl: data[originalUrlColumn],
    backupUrl: data.backup_storage_url,
    backupStatus: data.backup_status,
    fileSize: data.file_size,
    backedUpAt: data.backed_up_at
  };
}

// 사용 예시 함수
export async function getAvailableFileUrl(fileId, fileType = 'video') {
  const fileInfo = await getFileInfo(fileId, fileType);
  const result = await getFileWithFallback(fileInfo.originalUrl, fileInfo.backupUrl);
  
  return {
    ...result,
    fileInfo
  };
}