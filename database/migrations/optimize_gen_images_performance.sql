-- gen_images 테이블 성능 최적화를 위한 인덱스 및 쿼리 개선

-- 1. 필수 인덱스 추가 (이미 있으면 무시)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_images_project_is_kept_created 
    ON gen_images(project_id, is_kept, created_at DESC) 
    WHERE is_kept = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_images_user_is_kept_created 
    ON gen_images(user_id, is_kept, created_at DESC) 
    WHERE is_kept = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gen_images_generation_status 
    ON gen_images(generation_status, created_at DESC);

-- 2. 기존 불필요한 인덱스 정리 (있으면)
DROP INDEX CONCURRENTLY IF EXISTS idx_gen_images_created_at;

-- 3. 테이블 통계 업데이트
ANALYZE gen_images;

-- 4. 효율적인 이미지 조회를 위한 뷰 생성 (SECURITY INVOKER로 명시)
CREATE OR REPLACE VIEW gen_images_kept_view 
WITH (security_invoker = on) AS
SELECT 
    id,
    project_id,
    user_id,
    element_name,
    image_type,
    generation_model,
    result_image_url,
    storage_image_url,
    thumbnail_url,
    generation_status,
    style_name,
    is_kept,
    tags,
    created_at,
    updated_at
FROM gen_images 
WHERE is_kept = true 
  AND deleted_at IS NULL;

-- 5. RLS 정책을 View에 적용하지 않음 (기본 테이블의 정책 사용)
-- View는 SECURITY INVOKER이므로 호출자의 권한을 사용

-- 6. View에 대한 주석
COMMENT ON VIEW gen_images_kept_view IS '보관된 이미지만 효율적으로 조회하는 뷰 (SECURITY INVOKER)';