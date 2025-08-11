-- ref-images 버킷 생성
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types)
VALUES (
  'ref-images',
  'ref-images',
  true,
  false,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ref-images 버킷에 대한 정책 설정
-- 인증된 사용자는 업로드 가능
CREATE POLICY "Authenticated users can upload reference images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ref-images');

-- 모든 사용자가 읽기 가능 (public bucket)
CREATE POLICY "Public can view reference images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ref-images');

-- 인증된 사용자는 자신이 업로드한 이미지 삭제 가능
CREATE POLICY "Users can delete own reference images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ref-images' AND auth.uid()::text = (storage.foldername(name))[1]);