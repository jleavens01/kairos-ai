-- 파일 사이즈 컬럼 추가
-- gen_images 테이블에 file_size 컬럼 추가
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE gen_images ADD COLUMN IF NOT EXISTS height INTEGER;

-- gen_videos 테이블에 file_size 컬럼 추가  
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS upscale_file_size BIGINT;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE gen_videos ADD COLUMN IF NOT EXISTS duration FLOAT;

-- 인덱스 추가 (파일 사이즈로 정렬/필터링을 위해)
CREATE INDEX IF NOT EXISTS idx_gen_images_file_size ON gen_images(file_size);
CREATE INDEX IF NOT EXISTS idx_gen_videos_file_size ON gen_videos(file_size);

-- 코멘트 추가
COMMENT ON COLUMN gen_images.file_size IS '이미지 파일 크기 (bytes)';
COMMENT ON COLUMN gen_images.width IS '이미지 너비 (pixels)';
COMMENT ON COLUMN gen_images.height IS '이미지 높이 (pixels)';

COMMENT ON COLUMN gen_videos.file_size IS '비디오 파일 크기 (bytes)';
COMMENT ON COLUMN gen_videos.upscale_file_size IS '업스케일된 비디오 파일 크기 (bytes)';
COMMENT ON COLUMN gen_videos.width IS '비디오 너비 (pixels)';
COMMENT ON COLUMN gen_videos.height IS '비디오 높이 (pixels)';
COMMENT ON COLUMN gen_videos.duration IS '비디오 길이 (초)';