-- 업데이트 결과 확인
SELECT 
    'Updated Images' as type,
    COUNT(*) as count,
    MIN(file_size) as min_size,
    MAX(file_size) as max_size,
    AVG(file_size) as avg_size,
    pg_size_pretty(SUM(file_size)) as total_size
FROM gen_images 
WHERE file_size IS NOT NULL AND file_size > 0;

SELECT 
    'Updated Videos' as type,
    COUNT(*) as count,
    MIN(file_size) as min_size,
    MAX(file_size) as max_size,
    AVG(file_size) as avg_size,
    pg_size_pretty(SUM(file_size)) as total_size
FROM gen_videos 
WHERE file_size IS NOT NULL AND file_size > 0;