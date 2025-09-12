-- 불필요한 컬럼 제거 마이그레이션 (2025-09-12)

-- 1. gen_images 테이블에서 불필요한 컬럼 제거
ALTER TABLE gen_images DROP COLUMN IF EXISTS element_code;
ALTER TABLE gen_images DROP COLUMN IF EXISTS scene_number;
ALTER TABLE gen_images DROP COLUMN IF EXISTS thumbnail_url;
ALTER TABLE gen_images DROP COLUMN IF EXISTS style_id;
ALTER TABLE gen_images DROP COLUMN IF EXISTS style_name;
ALTER TABLE gen_images DROP COLUMN IF EXISTS version;
ALTER TABLE gen_images DROP COLUMN IF EXISTS generation_params;
ALTER TABLE gen_images DROP COLUMN IF EXISTS width;
ALTER TABLE gen_images DROP COLUMN IF EXISTS height;
ALTER TABLE gen_images DROP COLUMN IF EXISTS storage_image_url; -- result_image_url과 중복
ALTER TABLE gen_images DROP COLUMN IF EXISTS backup_storage_path; -- backup_storage_url로 충분

-- 2. 통계 업데이트
ANALYZE gen_images;