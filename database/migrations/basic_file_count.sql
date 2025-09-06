-- 기본적인 파일 현황 확인
-- 파일 사이즈 업데이트 전 전체 현황 파악

-- 1. 이미지 기본 현황
SELECT 
    'gen_images' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN storage_image_url IS NOT NULL THEN 1 END) as has_storage_url,
    COUNT(CASE WHEN result_image_url IS NOT NULL THEN 1 END) as has_result_url,
    COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed_status,
    COUNT(CASE WHEN file_size IS NOT NULL AND file_size > 0 THEN 1 END) as has_file_size,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM gen_images;

-- 2. 비디오 기본 현황
SELECT 
    'gen_videos' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN storage_video_url IS NOT NULL THEN 1 END) as has_storage_url,
    COUNT(CASE WHEN result_video_url IS NOT NULL THEN 1 END) as has_result_url,
    COUNT(CASE WHEN generation_status = 'completed' THEN 1 END) as completed_status,
    COUNT(CASE WHEN file_size IS NOT NULL AND file_size > 0 THEN 1 END) as has_file_size,
    COUNT(CASE WHEN upscale_video_url IS NOT NULL THEN 1 END) as has_upscale_url,
    COUNT(CASE WHEN upscale_file_size IS NOT NULL AND upscale_file_size > 0 THEN 1 END) as has_upscale_size,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM gen_videos;

-- 3. 업데이트 대상 파일들 샘플 (이미지 최신 5개)
SELECT 
    id,
    generation_model,
    generation_status,
    storage_image_url IS NOT NULL as has_storage_url,
    result_image_url IS NOT NULL as has_result_url,
    file_size,
    created_at,
    LEFT(storage_image_url, 50) || '...' as url_preview
FROM gen_images 
WHERE generation_status = 'completed'
  AND (storage_image_url IS NOT NULL OR result_image_url IS NOT NULL)
ORDER BY created_at DESC 
LIMIT 5;

-- 4. 업데이트 대상 파일들 샘플 (비디오 최신 5개)
SELECT 
    id,
    generation_model,
    generation_status,
    storage_video_url IS NOT NULL as has_storage_url,
    result_video_url IS NOT NULL as has_result_url,
    upscale_video_url IS NOT NULL as has_upscale_url,
    file_size,
    upscale_file_size,
    created_at,
    LEFT(storage_video_url, 50) || '...' as url_preview
FROM gen_videos 
WHERE generation_status = 'completed'
  AND (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
ORDER BY created_at DESC 
LIMIT 5;

-- 5. 모델별 파일 분포
SELECT 
    'Images by Model' as category,
    generation_model,
    COUNT(*) as count,
    COUNT(CASE WHEN storage_image_url IS NOT NULL THEN 1 END) as with_storage_url
FROM gen_images 
WHERE generation_status = 'completed'
GROUP BY generation_model
ORDER BY count DESC;

SELECT 
    'Videos by Model' as category,
    generation_model,
    COUNT(*) as count,
    COUNT(CASE WHEN storage_video_url IS NOT NULL THEN 1 END) as with_storage_url
FROM gen_videos 
WHERE generation_status = 'completed'
GROUP BY generation_model
ORDER BY count DESC;