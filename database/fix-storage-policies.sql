-- Supabase Storage 버킷 정책 수정
-- gen-images 버킷의 RLS 정책을 프로젝트 ID 기반으로 수정

-- Storage 정책은 Supabase Dashboard에서 설정해야 하지만,
-- 여기에 필요한 정책을 문서화합니다.

-- gen-images 버킷 정책 (Supabase Dashboard > Storage > Policies에서 설정)

-- 1. SELECT (다운로드/조회) 정책
-- Policy Name: Users can view images in their projects
-- Allowed operation: SELECT
-- Target roles: authenticated
-- Policy definition:
/*
bucket_id = 'gen-images' 
AND (
  -- 사용자가 소유한 프로젝트의 이미지
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE user_id = auth.uid()
  )
  OR
  -- 공개 프로젝트의 이미지
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE is_public = true
  )
)
*/

-- 2. INSERT (업로드) 정책
-- Policy Name: Users can upload images to their projects
-- Allowed operation: INSERT
-- Target roles: authenticated, anon
-- Policy definition:
/*
bucket_id = 'gen-images' 
AND (
  -- 사용자가 소유한 프로젝트에만 업로드 가능
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE user_id = auth.uid()
  )
  OR
  -- anon 사용자도 임시로 허용 (서비스 역할 대체)
  auth.role() = 'anon'
)
*/

-- 3. UPDATE 정책
-- Policy Name: Users can update images in their projects
-- Allowed operation: UPDATE
-- Target roles: authenticated
-- Policy definition:
/*
bucket_id = 'gen-images' 
AND (
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE user_id = auth.uid()
  )
)
*/

-- 4. DELETE 정책
-- Policy Name: Users can delete images in their projects
-- Allowed operation: DELETE
-- Target roles: authenticated
-- Policy definition:
/*
bucket_id = 'gen-images' 
AND (
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE user_id = auth.uid()
  )
)
*/

-- 간단한 임시 해결책: 모든 authenticated 사용자에게 gen-images 버킷 접근 허용
-- (보안상 권장하지 않지만 테스트용)
/*
-- SELECT 정책
bucket_id = 'gen-images'

-- INSERT 정책  
bucket_id = 'gen-images'

-- UPDATE 정책
bucket_id = 'gen-images'

-- DELETE 정책
bucket_id = 'gen-images'
*/

-- 참고: 위 정책들은 Supabase Dashboard에서 직접 설정해야 합니다.
-- Dashboard > Storage > Policies 에서 gen-images 버킷 선택 후 정책 추가/수정