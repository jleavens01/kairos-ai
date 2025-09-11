-- 공개 프로젝트 기능 비활성화 (단순 버전)
-- 단계별로 실행 가능하도록 분리

-- 1단계: 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Public projects are visible to all" ON public.projects;
DROP POLICY IF EXISTS "Anyone can view public projects" ON public.projects;

-- 2단계: 기본 정책 생성 (is_public 조건 제거)
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR auth.uid() = ANY(collaborators)
  );

-- 3단계: 모든 기존 프로젝트를 비공개로 설정
UPDATE projects SET is_public = false WHERE is_public = true;

-- 4단계: is_public 기본값을 false로 설정
ALTER TABLE projects ALTER COLUMN is_public SET DEFAULT false;