-- 4. content_scripts 테이블 (원고 데이터)
CREATE TABLE IF NOT EXISTS content_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    agent_task_id UUID REFERENCES agent_tasks(id),
    title VARCHAR(500) NOT NULL,
    script_data JSONB NOT NULL, -- 전체 원고 구조
    scenes JSONB DEFAULT '[]', -- 씬별 원고
    total_duration VARCHAR(50), -- 예: "10분 30초"
    word_count INTEGER,
    keywords JSONB DEFAULT '[]', -- SEO 키워드
    tone_style VARCHAR(100), -- 톤앤매너 스타일
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'review', 'approved', 'final'
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_content_scripts_item ON content_scripts(content_item_id);
CREATE INDEX idx_content_scripts_status ON content_scripts(status);

-- RLS 활성화
ALTER TABLE content_scripts ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책
CREATE POLICY "Service role access for content_scripts" ON content_scripts 
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_content_scripts_updated_at 
    BEFORE UPDATE ON content_scripts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();