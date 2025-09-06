-- 현재까지 업데이트된 파일 수 확인
SELECT 
    'Images with file size' as type,
    COUNT(*) as count,
    MIN(file_size) as min_size,
    MAX(file_size) as max_size,
    ROUND(AVG(file_size)) as avg_size,
    pg_size_pretty(SUM(file_size)) as total_size
FROM gen_images 
WHERE file_size IS NOT NULL AND file_size > 0

UNION ALL

SELECT 
    'Videos with file size' as type,
    COUNT(*) as count,
    MIN(file_size) as min_size,
    MAX(file_size) as max_size,
    ROUND(AVG(file_size)) as avg_size,
    pg_size_pretty(SUM(file_size)) as total_size
FROM gen_videos 
WHERE file_size IS NOT NULL AND file_size > 0

UNION ALL

SELECT 
    'TOTAL with file size' as type,
    (SELECT COUNT(*) FROM gen_images WHERE file_size IS NOT NULL AND file_size > 0) +
    (SELECT COUNT(*) FROM gen_videos WHERE file_size IS NOT NULL AND file_size > 0) as count,
    NULL as min_size,
    NULL as max_size, 
    NULL as avg_size,
    pg_size_pretty(
        (SELECT COALESCE(SUM(file_size), 0) FROM gen_images WHERE file_size IS NOT NULL AND file_size > 0) +
        (SELECT COALESCE(SUM(file_size), 0) FROM gen_videos WHERE file_size IS NOT NULL AND file_size > 0)
    ) as total_size;