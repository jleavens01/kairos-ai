-- gen-videos 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gen-videos',
  'gen-videos',
  true,
  524288000, -- 500MB 제한
  ARRAY['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'] -- 비디오와 썸네일 허용
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 스토리지 정책 설정
-- 인증된 사용자는 자신의 프로젝트 폴더에 업로드 가능
CREATE POLICY "Users can upload to own project folders" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'gen-videos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- 모든 사용자가 gen-videos 버킷의 파일을 볼 수 있음 (public 버킷)
CREATE POLICY "Public can view gen-videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'gen-videos');

-- 인증된 사용자는 자신의 프로젝트 폴더 내 파일을 수정 가능
CREATE POLICY "Users can update own videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'gen-videos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- 인증된 사용자는 자신의 프로젝트 폴더 내 파일을 삭제 가능
CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'gen-videos' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );