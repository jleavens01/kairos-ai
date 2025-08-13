-- selected_gen_images 뷰의 SECURITY DEFINER 제거
-- 이 뷰는 RLS 정책을 우회하지 않도록 SECURITY INVOKER(기본값)로 재생성

-- 기존 뷰 삭제
DROP VIEW IF EXISTS public.selected_gen_images;

-- SECURITY INVOKER(기본값)로 뷰 재생성
-- 이렇게 하면 뷰를 조회하는 사용자의 권한으로 실행됨
CREATE OR REPLACE VIEW public.selected_gen_images AS
SELECT DISTINCT ON (project_id, image_type, COALESCE(element_name, scene_number::text))
  *
FROM public.gen_images
WHERE is_selected = true
ORDER BY project_id, image_type, COALESCE(element_name, scene_number::text), version DESC;

-- 뷰에 대한 설명 추가
COMMENT ON VIEW public.selected_gen_images IS '각 요소별 최신 선택된 이미지를 조회하는 뷰 (RLS 정책 적용됨)';