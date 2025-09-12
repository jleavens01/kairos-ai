-- 섬네일 관련 필드 추가 (gen_images 테이블)
-- 2025-01-XX

-- 섬네일 관련 컬럼 추가
ALTER TABLE gen_images 
ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS thumbnail_size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS thumbnail_width INTEGER,
ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER;

-- 인덱스 추가 (섬네일 관련 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_gen_images_thumbnail_generated ON gen_images(thumbnail_generated_at);
CREATE INDEX IF NOT EXISTS idx_gen_images_has_thumbnail ON gen_images(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN gen_images.thumbnail_generated_at IS '섬네일 생성 시간';
COMMENT ON COLUMN gen_images.thumbnail_size_bytes IS '섬네일 파일 크기 (바이트)';
COMMENT ON COLUMN gen_images.thumbnail_width IS '섬네일 가로 크기';
COMMENT ON COLUMN gen_images.thumbnail_height IS '섬네일 세로 크기';

-- 통계 업데이트
ANALYZE gen_images;