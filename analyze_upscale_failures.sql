-- 업스케일 파일 분석 쿼리 (Supabase 웹 인터페이스에서 실행)

-- 1. 업스케일 파일 크기별 분포
SELECT 
    CASE 
        WHEN upscale_file_size IS NULL THEN '크기 정보 없음'
        WHEN upscale_file_size < 50000000 THEN '50MB 미만 (백업 가능)'
        WHEN upscale_file_size < 100000000 THEN '50-100MB (제한적 백업)'
        WHEN upscale_file_size < 200000000 THEN '100-200MB (백업 어려움)'
        ELSE '200MB 초과 (백업 불가)'
    END as size_category,
    COUNT(*) as file_count,
    pg_size_pretty(SUM(COALESCE(upscale_file_size, 0))) as total_size,
    pg_size_pretty(AVG(COALESCE(upscale_file_size, 0))::bigint) as avg_size
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL
GROUP BY 1
ORDER BY SUM(COALESCE(upscale_file_size, 0)) DESC;

-- 2. 백업 상태별 업스케일 파일 현황
SELECT 
    COALESCE(backup_status, '미시작') as backup_status,
    COUNT(*) as file_count,
    pg_size_pretty(SUM(COALESCE(upscale_file_size, 0))) as total_size,
    pg_size_pretty(AVG(COALESCE(upscale_file_size, 0))::bigint) as avg_size
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL
GROUP BY backup_status
ORDER BY COUNT(*) DESC;

-- 3. 백업 가능한 업스케일 파일들 (50MB 미만)
SELECT 
    id,
    generation_model,
    upscale_file_size,
    pg_size_pretty(upscale_file_size) as readable_size,
    backup_status,
    created_at::date as created_date
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL 
  AND upscale_file_size < 50000000
  AND (backup_storage_url IS NULL OR backup_status = 'failed')
ORDER BY upscale_file_size DESC
LIMIT 20;

-- 4. 백업 불가능한 대용량 업스케일 파일들 (200MB+)
SELECT 
    id,
    generation_model,
    upscale_file_size,
    pg_size_pretty(upscale_file_size) as readable_size,
    backup_status,
    created_at::date as created_date
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL 
  AND upscale_file_size >= 200000000
ORDER BY upscale_file_size DESC
LIMIT 10;

-- 5. 전체 백업 진행률 요약
SELECT 
    '업스케일 비디오' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) as backed_up,
    COUNT(CASE WHEN backup_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN backup_storage_url IS NULL AND COALESCE(backup_status, '') != 'failed' THEN 1 END) as pending,
    ROUND(
        COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as backup_percentage,
    pg_size_pretty(SUM(COALESCE(upscale_file_size, 0))) as total_size
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL

UNION ALL

SELECT 
    '일반 비디오' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) as backed_up,
    COUNT(CASE WHEN backup_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN backup_storage_url IS NULL AND COALESCE(backup_status, '') != 'failed' THEN 1 END) as pending,
    ROUND(
        COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as backup_percentage,
    pg_size_pretty(SUM(COALESCE(file_size, 0))) as total_size
FROM gen_videos 
WHERE (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
  AND upscale_video_url IS NULL

UNION ALL

SELECT 
    '이미지' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) as backed_up,
    COUNT(CASE WHEN backup_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN backup_storage_url IS NULL AND COALESCE(backup_status, '') != 'failed' THEN 1 END) as pending,
    ROUND(
        COUNT(CASE WHEN backup_storage_url IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as backup_percentage,
    pg_size_pretty(SUM(COALESCE(file_size, 0))) as total_size
FROM gen_images 
WHERE storage_image_url IS NOT NULL OR result_image_url IS NOT NULL;

-- 이 쿼리들을 Supabase 대시보드에서 실행해서 업스케일 파일 현황을 파악하세요.