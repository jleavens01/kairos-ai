-- RLS 정책 수정 - Unrestricted 문제 해결
-- 기존 정책 삭제 후 재생성

-- 기존 정책 삭제
DROP POLICY IF EXISTS reference_materials_select_policy ON reference_materials;
DROP POLICY IF EXISTS reference_materials_insert_policy ON reference_materials;
DROP POLICY IF EXISTS reference_materials_update_policy ON reference_materials;
DROP POLICY IF EXISTS reference_materials_delete_policy ON reference_materials;

-- RLS 활성화 확인
ALTER TABLE reference_materials ENABLE ROW LEVEL SECURITY;

-- SELECT 정책: 사용자는 자신의 자료 또는 같은 프로젝트의 자료 조회 가능
CREATE POLICY "Users can view own materials"
ON reference_materials
FOR SELECT
USING (
    auth.uid() = user_id 
    OR 
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- INSERT 정책: 인증된 사용자는 자료 생성 가능
CREATE POLICY "Users can create materials"
ON reference_materials
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- UPDATE 정책: 사용자는 자신의 자료만 수정 가능
CREATE POLICY "Users can update own materials"
ON reference_materials
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE 정책: 사용자는 자신의 자료만 삭제 가능
CREATE POLICY "Users can delete own materials"
ON reference_materials
FOR DELETE
USING (auth.uid() = user_id);

-- 정책이 제대로 적용되었는지 확인
-- 이 쿼리를 실행하여 정책 목록 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'reference_materials';