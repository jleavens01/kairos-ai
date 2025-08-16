-- 먼저 테이블에 user_id 컬럼 추가 (없는 경우)
ALTER TABLE reference_materials 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_id 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reference_materials_user_id ON reference_materials(user_id);

-- 기존 정책 삭제
DROP POLICY IF EXISTS reference_materials_select_policy ON reference_materials;
DROP POLICY IF EXISTS reference_materials_insert_policy ON reference_materials;
DROP POLICY IF EXISTS reference_materials_update_policy ON reference_materials;
DROP POLICY IF EXISTS reference_materials_delete_policy ON reference_materials;
DROP POLICY IF EXISTS "Users can view own materials" ON reference_materials;
DROP POLICY IF EXISTS "Users can create materials" ON reference_materials;
DROP POLICY IF EXISTS "Users can update own materials" ON reference_materials;
DROP POLICY IF EXISTS "Users can delete own materials" ON reference_materials;

-- RLS 활성화
ALTER TABLE reference_materials ENABLE ROW LEVEL SECURITY;

-- 새로운 정책 생성
-- SELECT: 인증된 모든 사용자가 조회 가능 (프로젝트 기반 필터링은 애플리케이션에서 처리)
CREATE POLICY "Enable read access for authenticated users"
ON reference_materials
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: 인증된 사용자가 생성 가능
CREATE POLICY "Enable insert for authenticated users"
ON reference_materials
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: 인증된 사용자가 수정 가능
CREATE POLICY "Enable update for authenticated users"
ON reference_materials
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- DELETE: 인증된 사용자가 삭제 가능
CREATE POLICY "Enable delete for authenticated users"
ON reference_materials
FOR DELETE
USING (auth.role() = 'authenticated');

-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reference_materials'
ORDER BY ordinal_position;