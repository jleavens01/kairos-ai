-- production_sheets 테이블에서 format 컬럼 제거
-- format은 더 이상 사용하지 않음

-- format 컬럼 제거
ALTER TABLE public.production_sheets 
DROP COLUMN IF EXISTS format;

-- 코멘트 업데이트
COMMENT ON TABLE public.production_sheets IS '프로젝트별 연출정리표 (씬 정보) - format 컬럼 제거됨';