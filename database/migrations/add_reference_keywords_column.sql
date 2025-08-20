-- production_sheets 테이블에 reference_keywords 컬럼 추가
ALTER TABLE production_sheets 
ADD COLUMN IF NOT EXISTS reference_keywords TEXT[] DEFAULT '{}';

-- 인덱스 추가 (배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_production_sheets_reference_keywords 
ON production_sheets USING GIN (reference_keywords);

-- 코멘트 추가
COMMENT ON COLUMN production_sheets.reference_keywords IS '씬에 필요한 자료 검색을 위한 AI 추출 키워드';