-- 5. content_storyboards 테이블 (스토리보드)
CREATE TABLE IF NOT EXISTS content_storyboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    content_script_id UUID REFERENCES content_scripts(id),
    project_id UUID, -- 기존 projects 테이블 참조 (선택적)
    storyboard_data JSONB NOT NULL, -- 전체 스토리보드 데이터
    scene_count INTEGER,
    total_duration VARCHAR(50),
    visual_style VARCHAR(100),
    status VARCHAR(50) DEFAULT 'created',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_content_storyboards_item ON content_storyboards(content_item_id);
CREATE INDEX idx_content_storyboards_script ON content_storyboards(content_script_id);
CREATE INDEX idx_content_storyboards_project ON content_storyboards(project_id);

-- RLS 활성화
ALTER TABLE content_storyboards ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책
CREATE POLICY "Service role access for content_storyboards" ON content_storyboards 
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_content_storyboards_updated_at 
    BEFORE UPDATE ON content_storyboards
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();