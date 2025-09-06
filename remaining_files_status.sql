-- 남은 파일들 현황 상세 분석

-- 1. 이미지 - 아직 처리되지 않은 파일들
SELECT 
    'Images - Pending Update' as category,
    COUNT(*) as total_pending,
    COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed_status,
    COUNT(CASE WHEN storage_image_url IS NOT NULL THEN 1 END) as has_storage_url
FROM gen_images 
WHERE (file_size IS NULL OR file_size = 0)
  AND (storage_image_url IS NOT NULL OR result_image_url IS NOT NULL);

-- 2. 비디오 - 아직 처리되지 않은 파일들 (일반)
SELECT 
    'Videos - Pending Update' as category,
    COUNT(*) as total_pending,
    COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed_status,
    COUNT(CASE WHEN storage_video_url IS NOT NULL THEN 1 END) as has_storage_url
FROM gen_videos 
WHERE (file_size IS NULL OR file_size = 0)
  AND (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL);

-- 3. 업스케일 비디오 - 아직 처리되지 않은 파일들
SELECT 
    'Upscale Videos - Pending Update' as category,
    COUNT(*) as total_pending,
    COUNT(CASE WHEN upscale_status = 'completed' THEN 1 END) as completed_status,
    COUNT(CASE WHEN upscale_video_url IS NOT NULL THEN 1 END) as has_upscale_url
FROM gen_videos 
WHERE (upscale_file_size IS NULL OR upscale_file_size = 0)
  AND upscale_video_url IS NOT NULL;

-- 4. 모델별 남은 비디오 파일들
SELECT 
    'Remaining Videos by Model' as category,
    generation_model,
    COUNT(*) as pending_count,
    COUNT(CASE WHEN file_size IS NOT NULL AND file_size > 0 THEN 1 END) as already_processed
FROM gen_videos 
WHERE generation_status = 'completed'
  AND (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
GROUP BY generation_model
ORDER BY pending_count DESC;

-- 5. 처리 우선순위 추천 (가장 최신 파일들부터)
SELECT 
    'Next Videos to Process' as category,
    id,
    generation_model,
    storage_video_url IS NOT NULL as has_storage_url,
    upscale_video_url IS NOT NULL as has_upscale_url,
    created_at
FROM gen_videos 
WHERE (file_size IS NULL OR file_size = 0)
  AND (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
  AND generation_status = 'completed'
ORDER BY created_at DESC 
LIMIT 10;

-- 6. 다음 이미지들 (최신순)
SELECT 
    'Next Images to Process' as category,
    id,
    generation_model,
    storage_image_url IS NOT NULL as has_storage_url,
    created_at
FROM gen_images 
WHERE (file_size IS NULL OR file_size = 0)
  AND (storage_image_url IS NOT NULL OR result_image_url IS NOT NULL)
  AND generation_status = 'completed'
ORDER BY created_at DESC 
LIMIT 10;