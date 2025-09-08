-- production_sheets 테이블에 metadata 필드 추가
-- 연출 분석 개선을 위한 메타데이터 저장

-- metadata 컬럼 추가
ALTER TABLE public.production_sheets 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 인덱스 추가 (JSONB 쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_production_sheets_metadata_scene_type 
ON public.production_sheets USING GIN ((metadata->>'scene_type'));

CREATE INDEX IF NOT EXISTS idx_production_sheets_metadata_analysis_version 
ON public.production_sheets USING GIN ((metadata->>'analysis_version'));

-- 컬럼 코멘트 추가
COMMENT ON COLUMN public.production_sheets.metadata IS '연출 메타데이터: scene_type, reference_sources, analysis_version 등을 JSONB로 저장';