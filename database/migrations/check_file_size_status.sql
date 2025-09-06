-- 기존 파일들의 파일 사이즈 현황 확인
-- 이 스크립트는 업데이트가 필요한 레코드를 확인하는 용도입니다.

-- 1. 이미지 파일 사이즈 현황
SELECT 
    'gen_images' as table_name,
    COUNT(*) as total_images,
    COUNT(CASE WHEN file_size IS NULL OR file_size = 0 THEN 1 END) as missing_file_size,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as has_file_size,
    COUNT(CASE WHEN storage_image_url IS NOT NULL THEN 1 END) as has_storage_url,
    COUNT(CASE WHEN storage_image_url IS NOT NULL AND (file_size IS NULL OR file_size = 0) THEN 1 END) as needs_update
FROM gen_images;

-- 2. 비디오 파일 사이즈 현황  
SELECT 
    'gen_videos' as table_name,
    COUNT(*) as total_videos,
    COUNT(CASE WHEN file_size IS NULL OR file_size = 0 THEN 1 END) as missing_file_size,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as has_file_size,
    COUNT(CASE WHEN upscale_file_size IS NULL OR upscale_file_size = 0 THEN 1 END) as missing_upscale_size,
    COUNT(CASE WHEN upscale_file_size > 0 THEN 1 END) as has_upscale_size,
    COUNT(CASE WHEN storage_video_url IS NOT NULL THEN 1 END) as has_storage_url,
    COUNT(CASE WHEN storage_video_url IS NOT NULL AND (file_size IS NULL OR file_size = 0) THEN 1 END) as needs_update,
    COUNT(CASE WHEN upscale_video_url IS NOT NULL AND (upscale_file_size IS NULL OR upscale_file_size = 0) THEN 1 END) as needs_upscale_update
FROM gen_videos;

-- 3. 파일 사이즈별 분포 (이미지)
SELECT 
    'Image Size Distribution' as category,
    COUNT(CASE WHEN file_size > 0 AND file_size < 1024*100 THEN 1 END) as small_under_100kb,
    COUNT(CASE WHEN file_size >= 1024*100 AND file_size < 1024*1024*5 THEN 1 END) as medium_100kb_5mb,
    COUNT(CASE WHEN file_size >= 1024*1024*5 AND file_size < 1024*1024*50 THEN 1 END) as large_5mb_50mb,
    COUNT(CASE WHEN file_size >= 1024*1024*50 THEN 1 END) as huge_over_50mb
FROM gen_images
WHERE file_size IS NOT NULL AND file_size > 0;

-- 4. 파일 사이즈별 분포 (비디오)
SELECT 
    'Video Size Distribution' as category,
    COUNT(CASE WHEN file_size > 0 AND file_size < 1024*1024*5 THEN 1 END) as small_under_5mb,
    COUNT(CASE WHEN file_size >= 1024*1024*5 AND file_size < 1024*1024*50 THEN 1 END) as medium_5mb_50mb,
    COUNT(CASE WHEN file_size >= 1024*1024*50 AND file_size < 1024*1024*500 THEN 1 END) as large_50mb_500mb,
    COUNT(CASE WHEN file_size >= 1024*1024*500 THEN 1 END) as huge_over_500mb
FROM gen_videos
WHERE file_size IS NOT NULL AND file_size > 0;

-- 5. 업데이트가 필요한 이미지 샘플 (최신 10개)
SELECT 
    id,
    generation_model,
    storage_image_url IS NOT NULL as has_url,
    file_size,
    width,
    height,
    created_at
FROM gen_images 
WHERE storage_image_url IS NOT NULL 
  AND (file_size IS NULL OR file_size = 0)
ORDER BY created_at DESC 
LIMIT 10;

-- 6. 업데이트가 필요한 비디오 샘플 (최신 10개)
SELECT 
    id,
    generation_model,
    storage_video_url IS NOT NULL as has_url,
    upscale_video_url IS NOT NULL as has_upscale_url,
    file_size,
    upscale_file_size,
    created_at
FROM gen_videos 
WHERE storage_video_url IS NOT NULL 
  AND (file_size IS NULL OR file_size = 0)
ORDER BY created_at DESC 
LIMIT 10;

-- 7. 총 저장 용량 계산 (이미 사이즈가 있는 파일들)
SELECT 
    'Storage Summary' as category,
    COUNT(CASE WHEN table_name = 'images' THEN 1 END) as images_count,
    COUNT(CASE WHEN table_name = 'videos' THEN 1 END) as videos_count,
    pg_size_pretty(SUM(CASE WHEN table_name = 'images' THEN file_size ELSE 0 END)) as images_total_size,
    pg_size_pretty(SUM(CASE WHEN table_name = 'videos' THEN file_size ELSE 0 END)) as videos_total_size,
    pg_size_pretty(SUM(CASE WHEN table_name = 'videos' THEN upscale_file_size ELSE 0 END)) as upscale_total_size,
    pg_size_pretty(SUM(total_size)) as grand_total_size
FROM (
    SELECT 'images' as table_name, file_size, 0 as upscale_file_size, file_size as total_size
    FROM gen_images WHERE file_size IS NOT NULL AND file_size > 0
    
    UNION ALL
    
    SELECT 'videos' as table_name, file_size, upscale_file_size, 
           COALESCE(file_size, 0) + COALESCE(upscale_file_size, 0) as total_size
    FROM gen_videos WHERE file_size IS NOT NULL AND file_size > 0
) combined;