-- 백업 URL 저장을 위한 컬럼 추가

-- gen_videos 테이블에 백업 관련 컬럼 추가
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS backup_drive_url TEXT;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS backup_drive_file_id TEXT;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS backed_up_at TIMESTAMPTZ;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS backup_status VARCHAR(20) DEFAULT 'pending';

-- gen_images 테이블에도 동일하게 추가
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS backup_drive_url TEXT;
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS backup_drive_file_id TEXT;
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS backed_up_at TIMESTAMPTZ;
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS backup_status VARCHAR(20) DEFAULT 'pending';

-- 백업 상태 인덱스 추가 (백업 필요한 파일들을 빠르게 찾기 위해)
CREATE INDEX IF NOT EXISTS idx_gen_videos_backup_status ON gen_videos(backup_status, created_at);
CREATE INDEX IF NOT EXISTS idx_gen_images_backup_status ON gen_images(backup_status, created_at);

-- 백업 상태별 통계 뷰 생성
CREATE OR REPLACE VIEW backup_status_summary AS
SELECT 
    'Videos' as media_type,
    backup_status,
    COUNT(*) as count,
    pg_size_pretty(SUM(COALESCE(file_size, 0) + COALESCE(upscale_file_size, 0))) as total_size
FROM gen_videos 
WHERE (storage_video_url IS NOT NULL OR upscale_video_url IS NOT NULL)
GROUP BY backup_status

UNION ALL

SELECT 
    'Images' as media_type,
    backup_status,
    COUNT(*) as count,
    pg_size_pretty(SUM(COALESCE(file_size, 0))) as total_size
FROM gen_images 
WHERE storage_image_url IS NOT NULL
GROUP BY backup_status;

-- Supabase Storage 백업 컬럼 추가 (대안 백업)
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS backup_storage_url TEXT;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS backup_storage_path TEXT;
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS backup_storage_url TEXT;
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS backup_storage_path TEXT;

-- 백업 성능 최적화를 위한 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_gen_videos_file_size ON gen_videos(file_size) WHERE file_size IS NOT NULL AND file_size > 0;
CREATE INDEX IF NOT EXISTS idx_gen_videos_upscale_file_size ON gen_videos(upscale_file_size) WHERE upscale_file_size IS NOT NULL AND upscale_file_size > 0;
CREATE INDEX IF NOT EXISTS idx_gen_images_file_size ON gen_images(file_size) WHERE file_size IS NOT NULL AND file_size > 0;

-- 코멘트 추가
COMMENT ON COLUMN gen_videos.backup_drive_url IS 'Google Drive Service Account 백업 파일의 공개 URL';
COMMENT ON COLUMN gen_videos.backup_drive_file_id IS 'Google Drive 파일 ID (Service Account)';
COMMENT ON COLUMN gen_videos.backup_storage_url IS 'Supabase Storage 백업 파일의 공개 URL (대안)';
COMMENT ON COLUMN gen_videos.backup_storage_path IS 'Supabase Storage 파일 경로 (대안)';
COMMENT ON COLUMN gen_videos.backed_up_at IS '백업 완료 시간';
COMMENT ON COLUMN gen_videos.backup_status IS '백업 상태: pending, in_progress, completed, failed';

COMMENT ON COLUMN gen_images.backup_drive_url IS 'Google Drive Service Account 백업 파일의 공개 URL';
COMMENT ON COLUMN gen_images.backup_drive_file_id IS 'Google Drive 파일 ID (Service Account)';
COMMENT ON COLUMN gen_images.backup_storage_url IS 'Supabase Storage 백업 파일의 공개 URL (대안)';
COMMENT ON COLUMN gen_images.backup_storage_path IS 'Supabase Storage 파일 경로 (대안)';
COMMENT ON COLUMN gen_images.backed_up_at IS '백업 완료 시간';
COMMENT ON COLUMN gen_images.backup_status IS '백업 상태: pending, in_progress, completed, failed';