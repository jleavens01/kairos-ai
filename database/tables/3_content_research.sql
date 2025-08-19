-- 3. content_research 테이블 (연구 데이터)
CREATE TABLE IF NOT EXISTS content_research (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    agent_task_id UUID REFERENCES agent_tasks(id),
    research_data JSONB NOT NULL, -- 연구 결과 데이터
    sources JSONB DEFAULT '[]', -- 참고 자료 목록
    facts JSONB DEFAULT '[]', -- 핵심 사실들
    statistics JSONB DEFAULT '[]', -- 통계 데이터
    visual_ideas JSONB DEFAULT '[]', -- 시각화 아이디어
    status VARCHAR(50) DEFAULT 'completed',
    quality_score INTEGER, -- 0-100 연구 품질 점수
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_content_research_item ON content_research(content_item_id);
CREATE INDEX idx_content_research_task ON content_research(agent_task_id);

-- RLS 활성화
ALTER TABLE content_research ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책
CREATE POLICY "Service role access for content_research" ON content_research 
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_content_research_updated_at 
    BEFORE UPDATE ON content_research
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();