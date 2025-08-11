-- script_analysis_jobs 테이블에 progress 컬럼 추가
-- 작업 진행률 추적용 (0-100)

ALTER TABLE public.script_analysis_jobs 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- 컬럼 코멘트 추가
COMMENT ON COLUMN public.script_analysis_jobs.progress IS '작업 진행률 (0-100%)';

-- 기존 row들의 progress 값 설정
UPDATE public.script_analysis_jobs 
SET progress = CASE 
  WHEN status = 'completed' THEN 100
  WHEN status = 'failed' THEN 0
  WHEN status = 'processing' OR status = 'ai_processing' THEN 50
  WHEN status = 'saving_to_db' THEN 90
  ELSE 0
END
WHERE progress IS NULL;