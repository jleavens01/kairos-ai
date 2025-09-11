-- 공개 프로젝트 기능 비활성화
-- is_public 조건을 제거하여 오직 소유자와 공유받은 사용자만 접근 가능하도록 수정

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;

-- 새로운 정책 생성 (is_public 조건 제거, 공유받은 프로젝트 접근 추가)
-- 먼저 project_shares 테이블 없이 기본 정책 생성
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR auth.uid() = ANY(collaborators)
  );

-- project_shares 테이블이 존재하는 경우에만 정책 업데이트
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_shares') THEN
    -- 기존 정책 삭제 후 공유 기능 포함된 정책 재생성
    DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
    
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
  END IF;
END $$;

-- 공개 프로젝트 관련 정책들이 있다면 제거
DROP POLICY IF EXISTS "Public projects are visible to all" ON public.projects;
DROP POLICY IF EXISTS "Anyone can view public projects" ON public.projects;

-- 공개 프로젝트 관련 인덱스들 제거 (성능 최적화)
DROP INDEX IF EXISTS idx_projects_public;
DROP INDEX IF EXISTS idx_projects_featured;
DROP INDEX IF EXISTS idx_projects_view_count; 
DROP INDEX IF EXISTS idx_projects_like_count;

-- is_public 컬럼은 유지하되 기본값을 false로 설정 (기존 데이터 호환성)
-- 향후 필요시 컬럼을 완전히 제거할 수 있음
ALTER TABLE projects ALTER COLUMN is_public SET DEFAULT false;

-- 모든 기존 프로젝트를 비공개로 설정
UPDATE projects SET is_public = false WHERE is_public = true;