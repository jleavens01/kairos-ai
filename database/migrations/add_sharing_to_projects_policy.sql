-- 프로젝트 정책에 공유 기능 추가
-- project_shares 테이블이 생성된 후에 실행

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;

-- 공유 기능이 포함된 새 정책 생성
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR auth.uid() = ANY(collaborators)
    OR id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );