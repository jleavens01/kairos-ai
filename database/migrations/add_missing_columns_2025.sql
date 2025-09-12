-- 누락된 컬럼 추가 마이그레이션 (2025-09-12)

-- 1. gen_images 테이블에 누락된 컬럼 추가
ALTER TABLE gen_images 
ADD COLUMN IF NOT EXISTS is_kept BOOLEAN DEFAULT false;

ALTER TABLE gen_images 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- 1-2. gen_videos 테이블에 누락된 컬럼 추가
ALTER TABLE gen_videos 
ADD COLUMN IF NOT EXISTS is_kept BOOLEAN DEFAULT false;

-- 2. reference_materials 테이블이 없다면 생성 또는 컬럼 확인
-- (description 컬럼이 없는 경우 대비)
ALTER TABLE reference_materials 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE reference_materials 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE reference_materials 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 3. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_gen_images_is_kept 
ON gen_images(is_kept);

CREATE INDEX IF NOT EXISTS idx_gen_images_is_shared 
ON gen_images(is_shared);

CREATE INDEX IF NOT EXISTS idx_gen_videos_is_kept 
ON gen_videos(is_kept);

CREATE INDEX IF NOT EXISTS idx_reference_materials_image_url 
ON reference_materials(image_url);

-- 4. 기존 레코드 업데이트 (기본값 설정)
UPDATE gen_images 
SET is_kept = false 
WHERE is_kept IS NULL;

UPDATE gen_images 
SET is_shared = false 
WHERE is_shared IS NULL;

UPDATE gen_videos 
SET is_kept = false 
WHERE is_kept IS NULL;

-- 5. 통계 업데이트
ANALYZE gen_images;
ANALYZE gen_videos;
ANALYZE reference_materials;