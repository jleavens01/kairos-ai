-- projects 버킷 생성 (비디오 생성에서 사용하는 다른 경로용)
-- 이미 ref-images 버킷이 있지만, projects 버킷도 필요한 경우를 위해 생성

INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types)
VALUES (
  'projects',
  'projects',
  true,
  false,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- projects 버킷에 대한 정책 설정
-- 인증된 사용자는 업로드 가능
CREATE POLICY "Authenticated users can upload to projects bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'projects');

-- 모든 사용자가 읽기 가능 (public bucket)
CREATE POLICY "Public can view projects bucket files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'projects');

-- 인증된 사용자는 자신의 프로젝트 파일 수정 가능
CREATE POLICY "Users can update own project files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'projects' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 인증된 사용자는 자신의 프로젝트 파일 삭제 가능
CREATE POLICY "Users can delete own project files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'projects' AND auth.uid()::text = (storage.foldername(name))[1]);