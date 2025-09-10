-- 프로젝트 소셜 기능을 위한 컬럼 추가
-- 조회수, 좋아요 수 등 공개 갤러리에 필요한 필드들

-- projects 테이블에 컬럼 추가
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fork_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;

-- 프로젝트 좋아요 테이블 생성
CREATE TABLE IF NOT EXISTS project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 프로젝트 북마크 테이블 생성
CREATE TABLE IF NOT EXISTS project_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 프로젝트 조회 로그 테이블 생성 (선택적)
CREATE TABLE IF NOT EXISTS project_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로젝트 신고 테이블 생성
CREATE TABLE IF NOT EXISTS project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- RLS 정책 설정

-- project_likes 테이블 RLS
ALTER TABLE project_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 좋아요만 관리할 수 있음" ON project_likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "공개 프로젝트의 좋아요는 모두 볼 수 있음" ON project_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_likes.project_id 
      AND projects.is_public = true
    )
  );

-- project_bookmarks 테이블 RLS  
ALTER TABLE project_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 북마크만 관리할 수 있음" ON project_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- project_views 테이블 RLS
ALTER TABLE project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "조회 로그는 삽입만 가능" ON project_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "관리자만 조회 로그를 볼 수 있음" ON project_views
  FOR SELECT USING (false); -- 일반 사용자는 조회 불가

-- project_reports 테이블 RLS
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 신고만 볼 수 있음" ON project_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "로그인한 사용자는 신고할 수 있음" ON project_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public, created_at DESC) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured, featured_at DESC) WHERE featured = true AND is_public = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_view_count ON projects(view_count DESC) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_like_count ON projects(like_count DESC) WHERE is_public = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_likes_project ON project_likes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_likes_user ON project_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_project ON project_bookmarks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_user ON project_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_views_project ON project_views(project_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_project_reports_status ON project_reports(status, created_at);

-- 트리거 함수: 좋아요 수 자동 업데이트
CREATE OR REPLACE FUNCTION update_project_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects 
    SET like_count = like_count + 1 
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects 
    SET like_count = GREATEST(like_count - 1, 0) 
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 좋아요 수 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_like_count ON project_likes;
CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON project_likes
  FOR EACH ROW EXECUTE FUNCTION update_project_like_count();

-- 북마크 수 자동 업데이트
CREATE OR REPLACE FUNCTION update_project_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects 
    SET bookmark_count = bookmark_count + 1 
    WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects 
    SET bookmark_count = GREATEST(bookmark_count - 1, 0) 
    WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 북마크 수 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_bookmark_count ON project_bookmarks;
CREATE TRIGGER trigger_update_bookmark_count
  AFTER INSERT OR DELETE ON project_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_project_bookmark_count();

-- 초기 데이터 설정 (기존 프로젝트의 카운트를 0으로 설정)
UPDATE projects 
SET 
  view_count = COALESCE(view_count, 0),
  like_count = COALESCE(like_count, 0),
  bookmark_count = COALESCE(bookmark_count, 0),
  fork_count = COALESCE(fork_count, 0)
WHERE 
  view_count IS NULL 
  OR like_count IS NULL 
  OR bookmark_count IS NULL 
  OR fork_count IS NULL;