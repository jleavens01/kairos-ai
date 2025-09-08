-- gen_heygen_videos 테이블에 project_id 컬럼 추가
-- 기존 테이블과의 일관성을 위해 추가

-- project_id 컬럼 추가
ALTER TABLE gen_heygen_videos 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- 인덱스 추가 (프로젝트별 조회를 빠르게 하기 위해)
CREATE INDEX IF NOT EXISTS idx_gen_heygen_videos_project_id 
ON gen_heygen_videos(project_id);

-- 복합 인덱스 추가 (프로젝트별 최신 순 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_gen_heygen_videos_project_created 
ON gen_heygen_videos(project_id, created_at DESC);

-- photo_avatars 테이블 생성 (아직 없는 경우)
CREATE TABLE IF NOT EXISTS photo_avatars (
    -- 기본 필드
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Photo Avatar 정보
    name VARCHAR(255) NOT NULL,
    generation_id VARCHAR(255) UNIQUE,
    avatar_id VARCHAR(255),
    
    -- 생성 파라미터
    age VARCHAR(50),
    gender VARCHAR(50),
    ethnicity VARCHAR(50),
    orientation VARCHAR(50),
    pose VARCHAR(50),
    style VARCHAR(50),
    appearance TEXT,
    
    -- 이미지 정보
    photo_url TEXT,
    thumbnail_url TEXT,
    preview_url TEXT,
    
    -- 상태
    status VARCHAR(20) DEFAULT 'processing',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- 메타데이터
    generation_params JSONB,
    api_response JSONB,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- 제약조건
    CONSTRAINT valid_photo_avatar_status CHECK (status IN ('processing', 'completed', 'failed')),
    CONSTRAINT valid_photo_avatar_progress CHECK (progress >= 0 AND progress <= 100)
);

-- photo_avatars 인덱스
CREATE INDEX IF NOT EXISTS idx_photo_avatars_user_id ON photo_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_avatars_project_id ON photo_avatars(project_id);
CREATE INDEX IF NOT EXISTS idx_photo_avatars_status ON photo_avatars(status);
CREATE INDEX IF NOT EXISTS idx_photo_avatars_created_at ON photo_avatars(created_at DESC);

-- photo_avatars 업데이트 트리거
CREATE OR REPLACE FUNCTION update_photo_avatars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_photo_avatars_updated_at ON photo_avatars;
CREATE TRIGGER trigger_photo_avatars_updated_at
    BEFORE UPDATE ON photo_avatars
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_avatars_updated_at();

-- photo_avatars RLS 정책
ALTER TABLE photo_avatars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own photo avatars" ON photo_avatars;
CREATE POLICY "Users can view their own photo avatars" ON photo_avatars
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own photo avatars" ON photo_avatars;
CREATE POLICY "Users can insert their own photo avatars" ON photo_avatars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own photo avatars" ON photo_avatars;
CREATE POLICY "Users can update their own photo avatars" ON photo_avatars
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own photo avatars" ON photo_avatars;
CREATE POLICY "Users can delete their own photo avatars" ON photo_avatars
    FOR DELETE USING (auth.uid() = user_id);

-- 코멘트 추가
COMMENT ON TABLE photo_avatars IS 'HeyGen Photo Avatar 생성 기록';
COMMENT ON COLUMN gen_heygen_videos.project_id IS '연결된 프로젝트 ID';
COMMENT ON COLUMN photo_avatars.project_id IS '연결된 프로젝트 ID';