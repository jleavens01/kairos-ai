-- 씬 그룹화 및 시퀀스 구조를 위한 필드 추가
-- 이는 향후 Sequence → Scene → Cut 구조의 기반이 됩니다

-- production_sheets 테이블에 시퀀스 관련 컬럼 추가
ALTER TABLE production_sheets 
ADD COLUMN sequence_id INTEGER DEFAULT 1;

ALTER TABLE production_sheets 
ADD COLUMN sequence_name TEXT DEFAULT 'Sequence 1';

ALTER TABLE production_sheets 
ADD COLUMN sequence_order INTEGER DEFAULT 1;

ALTER TABLE production_sheets 
ADD COLUMN scene_group TEXT DEFAULT NULL;

ALTER TABLE production_sheets 
ADD COLUMN scene_tags TEXT[] DEFAULT '{}';

ALTER TABLE production_sheets 
ADD COLUMN metadata JSONB DEFAULT '{}';

-- 기존 씬들에 기본 시퀀스 정보 설정
UPDATE production_sheets 
SET 
  sequence_id = 1,
  sequence_name = 'Sequence 1',
  sequence_order = 1
WHERE sequence_id IS NULL;

-- 시퀀스별 씬 정렬을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_production_sheets_sequence 
ON production_sheets (project_id, sequence_id, scene_number);

-- 씬 그룹 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_production_sheets_group 
ON production_sheets (project_id, scene_group);

-- 씬 태그 검색을 위한 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_production_sheets_tags 
ON production_sheets USING GIN (scene_tags);

-- 메타데이터 검색을 위한 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_production_sheets_metadata 
ON production_sheets USING GIN (metadata);

COMMENT ON COLUMN production_sheets.sequence_id IS '시퀀스 ID (스토리 아크 단위)';
COMMENT ON COLUMN production_sheets.sequence_name IS '시퀀스 이름 (예: "Opening", "Conflict", "Resolution")';
COMMENT ON COLUMN production_sheets.sequence_order IS '시퀀스 내에서의 순서';
COMMENT ON COLUMN production_sheets.scene_group IS '씬 그룹 (임시 그룹핑용)';
COMMENT ON COLUMN production_sheets.scene_tags IS '씬 태그 배열 (검색 및 분류용)';
COMMENT ON COLUMN production_sheets.metadata IS '추가 메타데이터 (JSON 형태)';