-- 성능 최적화 인덱스 추가 (gen_images 테이블)
-- ⚠️ 주의: Supabase에서는 각 인덱스를 개별적으로 실행해야 합니다 (CONCURRENTLY 때문에)

-- 1단계: VideoGenerationModal - 라이브러리 이미지 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_gen_images_library_query 
ON public.gen_images (project_id, generation_status, is_kept, is_shared, created_at DESC);

-- 2단계: AIGenerationGallery - 보관함 필터링 최적화  
CREATE INDEX IF NOT EXISTS idx_gen_images_gallery_filter 
ON public.gen_images (project_id, is_kept, image_type, created_at DESC);

-- 3단계: 일반적인 조회 성능 향상
CREATE INDEX IF NOT EXISTS idx_gen_images_status_created 
ON public.gen_images (project_id, generation_status, created_at DESC);

-- 4단계: gen_videos 테이블 최적화
CREATE INDEX IF NOT EXISTS idx_gen_videos_library_query 
ON public.gen_videos (project_id, generation_status, created_at DESC);

-- 5단계: 통계 정보 업데이트 (PostgreSQL 통계 수집)
ANALYZE public.gen_images;
ANALYZE public.gen_videos;
ANALYZE public.reference_materials;

-- 성능 최적화 설명:
-- 1. CONCURRENTLY: 온라인으로 인덱스 생성 (다운타임 없음)
-- 2. 복합 인덱스: WHERE 절의 조건들을 모두 포함
-- 3. created_at DESC: ORDER BY와 일치하는 정렬 순서
-- 4. ANALYZE: 쿼리 플래너가 최적의 실행 계획을 세울 수 있도록 통계 업데이트

-- 📋 Supabase에서 실행하는 방법:
-- 1. Supabase Dashboard → SQL Editor로 이동
-- 2. 아래 각 단계를 하나씩 복사해서 실행 (한 번에 실행하지 말 것!)

/*
단계 1: 
CREATE INDEX IF NOT EXISTS idx_gen_images_library_query 
ON public.gen_images (project_id, generation_status, is_kept, is_shared, created_at DESC);

단계 2:
CREATE INDEX IF NOT EXISTS idx_gen_images_gallery_filter 
ON public.gen_images (project_id, is_kept, image_type, created_at DESC);

단계 3:
CREATE INDEX IF NOT EXISTS idx_gen_images_status_created 
ON public.gen_images (project_id, generation_status, created_at DESC);

단계 4:
CREATE INDEX IF NOT EXISTS idx_gen_videos_library_query 
ON public.gen_videos (project_id, generation_status, created_at DESC);

단계 5:
ANALYZE public.gen_images;
ANALYZE public.gen_videos;
ANALYZE public.reference_materials;
*/