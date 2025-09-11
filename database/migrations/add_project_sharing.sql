-- 프로젝트 공유 기능을 위한 테이블 생성
-- 사용자 간 프로젝트 공유 및 권한 관리

-- project_shares 테이블 생성
CREATE TABLE IF NOT EXISTS project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) DEFAULT 'editor' CHECK (permission_level IN ('viewer', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, shared_with_user_id)
);

-- RLS 정책 설정
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있다면 삭제
DROP POLICY IF EXISTS "프로젝트 소유자는 자신이 공유한 프로젝트를 관리할 수 있음" ON project_shares;
DROP POLICY IF EXISTS "공유받은 사용자는 자신에게 공유된 프로젝트를 볼 수 있음" ON project_shares;

-- 프로젝트 소유자는 자신이 공유한 프로젝트를 볼 수 있음
CREATE POLICY "프로젝트 소유자는 자신이 공유한 프로젝트를 관리할 수 있음" ON project_shares
  FOR ALL USING (auth.uid() = shared_by_user_id);

-- 공유받은 사용자는 자신에게 공유된 프로젝트를 볼 수 있음
CREATE POLICY "공유받은 사용자는 자신에게 공유된 프로젝트를 볼 수 있음" ON project_shares
  FOR SELECT USING (auth.uid() = shared_with_user_id);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_project_shares_project ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_by ON project_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_with ON project_shares(shared_with_user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_project_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_shares_updated_at ON project_shares;
CREATE TRIGGER trigger_update_project_shares_updated_at
  BEFORE UPDATE ON project_shares
  FOR EACH ROW EXECUTE FUNCTION update_project_shares_updated_at();