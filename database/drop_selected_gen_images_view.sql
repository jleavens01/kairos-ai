-- selected_gen_images 뷰 삭제
-- 이 뷰는 버전 관리 개념이었으나, 현재 갤러리 방식으로 
-- 모든 이미지를 표시하므로 사용되지 않음

-- 뷰 삭제
DROP VIEW IF EXISTS public.selected_gen_images CASCADE;

-- gen_images 테이블의 is_selected 컬럼도 사용하지 않으므로 
-- 향후 제거 고려 (현재는 데이터 호환성을 위해 유지)
-- ALTER TABLE public.gen_images DROP COLUMN IF EXISTS is_selected;
-- ALTER TABLE public.gen_images DROP COLUMN IF EXISTS version;

COMMENT ON TABLE public.gen_images IS 'AI로 생성된 이미지 관리 - 갤러리 방식으로 모든 이미지 표시';