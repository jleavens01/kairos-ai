-- 백업 실패한 파일들 추적 및 재시도용 쿼리

-- 1. 백업 실패한 업스케일 비디오 (200MB 파일들)
CREATE OR REPLACE VIEW failed_upscale_videos AS
SELECT 
    id,
    generation_model,
    upscale_video_url,
    upscale_file_size,
    backup_status,
    created_at,
    '업스케일 비디오 - 크기 제한' as failure_reason
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL 
  AND (backup_storage_url IS NULL OR backup_status = 'failed')
  AND upscale_file_size > 50000000  -- 50MB 이상
ORDER BY upscale_file_size DESC;

-- 2. 백업 실패한 일반 파일들
CREATE OR REPLACE VIEW failed_regular_files AS
SELECT 
    'video' as file_type,
    id,
    generation_model,
    COALESCE(storage_video_url, result_video_url) as file_url,
    file_size,
    backup_status,
    created_at
FROM gen_videos 
WHERE (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
  AND (backup_storage_url IS NULL OR backup_status = 'failed')
  AND upscale_video_url IS NULL  -- 업스케일이 아닌 일반 비디오

UNION ALL

SELECT 
    'image' as file_type,
    id,
    generation_model,
    COALESCE(storage_image_url, result_image_url) as file_url,
    file_size,
    backup_status,
    created_at
FROM gen_images 
WHERE (storage_image_url IS NOT NULL OR result_image_url IS NOT NULL)
  AND (backup_storage_url IS NULL OR backup_status = 'failed')
ORDER BY file_size DESC;

-- 3. 백업 진행 상황 요약
CREATE OR REPLACE VIEW backup_progress_summary AS
SELECT 
    '업스케일 비디오' as category,
    COUNT(*) as total_files,
    COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) as backed_up,
    COUNT(CASE WHEN backup_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN backup_storage_url IS NULL AND backup_status != 'failed' THEN 1 END) as pending,
    pg_size_pretty(SUM(COALESCE(upscale_file_size, 0))) as total_size,
    pg_size_pretty(SUM(CASE WHEN backup_storage_url IS NOT NULL THEN COALESCE(upscale_file_size, 0) ELSE 0 END)) as backed_up_size
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL

UNION ALL

SELECT 
    '일반 비디오' as category,
    COUNT(*) as total_files,
    COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) as backed_up,
    COUNT(CASE WHEN backup_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN backup_storage_url IS NULL AND backup_status != 'failed' THEN 1 END) as pending,
    pg_size_pretty(SUM(COALESCE(file_size, 0))) as total_size,
    pg_size_pretty(SUM(CASE WHEN backup_storage_url IS NOT NULL THEN COALESCE(file_size, 0) ELSE 0 END)) as backed_up_size
FROM gen_videos 
WHERE (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
  AND upscale_video_url IS NULL

UNION ALL

SELECT 
    '이미지' as category,
    COUNT(*) as total_files,
    COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) as backed_up,
    COUNT(CASE WHEN backup_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN backup_storage_url IS NULL AND backup_status != 'failed' THEN 1 END) as pending,
    pg_size_pretty(SUM(COALESCE(file_size, 0))) as total_size,
    pg_size_pretty(SUM(CASE WHEN backup_storage_url IS NOT NULL THEN COALESCE(file_size, 0) ELSE 0 END)) as backed_up_size
FROM gen_images 
WHERE storage_image_url IS NOT NULL OR result_image_url IS NOT NULL;

-- 4. 재시도가 필요한 파일 우선순위 (크기 순)
CREATE OR REPLACE VIEW retry_priority_list AS
SELECT 
    'upscale_video' as file_type,
    id,
    generation_model,
    upscale_video_url as file_url,
    upscale_file_size as file_size,
    '대용량 파일 - 대안 방법 필요' as note
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL 
  AND (backup_storage_url IS NULL OR backup_status = 'failed')
  AND upscale_file_size > 50000000

UNION ALL

SELECT 
    'regular_video' as file_type,
    id,
    generation_model,
    COALESCE(storage_video_url, result_video_url) as file_url,
    file_size,
    'Supabase Storage 재시도 가능' as note
FROM gen_videos 
WHERE (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
  AND (backup_storage_url IS NULL OR backup_status = 'failed')
  AND (upscale_video_url IS NULL OR upscale_file_size <= 50000000)

UNION ALL

SELECT 
    'image' as file_type,
    id,
    generation_model,
    COALESCE(storage_image_url, result_image_url) as file_url,
    file_size,
    'Supabase Storage 재시도 가능' as note
FROM gen_images 
WHERE (storage_image_url IS NOT NULL OR result_image_url IS NOT NULL)
  AND (backup_storage_url IS NULL OR backup_status = 'failed')

ORDER BY file_size DESC;

-- 사용법 예시:
-- SELECT * FROM backup_progress_summary;
-- SELECT * FROM failed_upscale_videos LIMIT 10;
-- SELECT * FROM retry_priority_list WHERE file_type = 'image' LIMIT 20;