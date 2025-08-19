-- 1. content_items 테이블 (뉴스 수집 및 콘텐츠 아이템)
CREATE TABLE IF NOT EXISTS content_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    source_url TEXT,
    source_type VARCHAR(50), -- 'news', 'article', 'video', 'research'
    category VARCHAR(100),
    thumbnail_url TEXT,
    score INTEGER DEFAULT 0,
    suitability VARCHAR(20), -- 'perfect', 'high', 'medium', 'low'
    status VARCHAR(50) DEFAULT 'selected', -- 'selected', 'researching', 'writing', 'production', 'completed', 'archived'
    workflow_stage VARCHAR(50), -- 'item_selection', 'research', 'script_writing', 'storyboard', 'production'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_workflow ON content_items(workflow_stage);
CREATE INDEX idx_content_items_created ON content_items(created_at DESC);

-- RLS 활성화
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책
CREATE POLICY "Service role access for content_items" ON content_items 
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_content_items_updated_at 
    BEFORE UPDATE ON content_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();