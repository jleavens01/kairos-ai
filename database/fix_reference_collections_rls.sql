-- reference_collections 테이블 RLS 정책 설정

-- RLS 활성화
ALTER TABLE reference_collections ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON reference_collections;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON reference_collections;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON reference_collections;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON reference_collections;

-- SELECT: 인증된 사용자가 조회 가능
CREATE POLICY "Enable read access for authenticated users"
ON reference_collections
FOR SELECT
USING (auth.role() = 'authenticated');

-- INSERT: 인증된 사용자가 생성 가능
CREATE POLICY "Enable insert for authenticated users"
ON reference_collections
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: 인증된 사용자가 수정 가능
CREATE POLICY "Enable update for authenticated users"
ON reference_collections
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- DELETE: 인증된 사용자가 삭제 가능
CREATE POLICY "Enable delete for authenticated users"
ON reference_collections
FOR DELETE
USING (auth.role() = 'authenticated');

-- 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'reference_collections';