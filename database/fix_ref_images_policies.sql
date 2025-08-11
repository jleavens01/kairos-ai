-- ref-images 버킷의 RLS 정책 수정

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Authenticated users can upload reference images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view reference images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own reference images" ON storage.objects;

-- 인증된 사용자는 ref-images 버킷에 업로드 가능
CREATE POLICY "Auth users can upload ref images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ref-images' 
  AND auth.role() = 'authenticated'
);

-- 모든 사용자가 ref-images 버킷의 이미지를 볼 수 있음
CREATE POLICY "Anyone can view ref images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ref-images');

-- 인증된 사용자는 자신이 업로드한 이미지를 업데이트할 수 있음
CREATE POLICY "Users can update own ref images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ref-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 인증된 사용자는 자신이 업로드한 이미지를 삭제할 수 있음
CREATE POLICY "Users can delete own ref images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ref-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS가 활성화되어 있는지 확인하고 활성화
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 버킷 설정 확인 및 업데이트
UPDATE storage.buckets 
SET 
  public = true,
  avif_autodetection = false,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[],
  file_size_limit = 5242880
WHERE id = 'ref-images';