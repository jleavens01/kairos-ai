-- gen-images Storage 버킷 정책 생성
-- Supabase Dashboard > SQL Editor에서 실행

-- 기존 정책 삭제 (있다면)
DELETE FROM storage.policies WHERE bucket_id = 'gen-images';

-- 간단한 공개 접근 정책 (모든 작업 허용)
INSERT INTO storage.policies (bucket_id, name, operation, definition)
VALUES 
  ('gen-images', 'Public Access SELECT', 'SELECT', 'true'),
  ('gen-images', 'Public Access INSERT', 'INSERT', 'true'),
  ('gen-images', 'Public Access UPDATE', 'UPDATE', 'true'),
  ('gen-images', 'Public Access DELETE', 'DELETE', 'true');

-- 더 세밀한 정책들 (위의 공개 정책 대신 사용 가능)
-- 아래 정책들을 사용하려면 위의 공개 정책 4줄을 주석처리하거나 삭제하세요

/*
-- 1. SELECT 정책 - 프로젝트 소유자나 공개 프로젝트 이미지 조회 가능
INSERT INTO storage.policies (bucket_id, name, operation, definition)
VALUES (
  'gen-images',
  'Users can view project images',
  'SELECT',
  'true'  -- 모든 사용자가 조회 가능 (이미지는 공개)
);

-- 2. INSERT 정책 - 인증된 사용자만 업로드 가능
INSERT INTO storage.policies (bucket_id, name, operation, definition)
VALUES (
  'gen-images',
  'Authenticated users can upload',
  'INSERT',
  'auth.role() = ''authenticated'''
);

-- 3. UPDATE 정책 - 인증된 사용자만 수정 가능
INSERT INTO storage.policies (bucket_id, name, operation, definition)
VALUES (
  'gen-images',
  'Authenticated users can update',
  'UPDATE',
  'auth.role() = ''authenticated'''
);

-- 4. DELETE 정책 - 인증된 사용자만 삭제 가능
INSERT INTO storage.policies (bucket_id, name, operation, definition)
VALUES (
  'gen-images',
  'Authenticated users can delete',
  'DELETE',
  'auth.role() = ''authenticated'''
);
*/