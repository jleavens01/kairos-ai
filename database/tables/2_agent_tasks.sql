-- 2. agent_tasks 테이블 (AI 에이전트 작업 관리)
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL, -- 'researcher', 'writer', 'visual_director', 'designer', 'animator', 'narrator', 'editor'
    task_type VARCHAR(100) NOT NULL, -- 'research', 'script_writing', 'storyboard_generation', 'image_generation', 'video_generation'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    priority INTEGER DEFAULT 50, -- 0-100, 높을수록 우선순위 높음
    parameters JSONB DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_agent_tasks_content ON agent_tasks(content_item_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agent_type);
CREATE INDEX idx_agent_tasks_priority ON agent_tasks(priority DESC);

-- RLS 활성화
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책
CREATE POLICY "Service role access for agent_tasks" ON agent_tasks 
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_agent_tasks_updated_at 
    BEFORE UPDATE ON agent_tasks
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();