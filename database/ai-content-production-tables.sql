-- AI 콘텐츠 제작 시스템 데이터베이스 테이블
-- 기존 시스템과 독립적으로 운영되는 테이블들

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

-- 6. agent_learning_data 테이블 (에이전트 학습 데이터)
CREATE TABLE IF NOT EXISTS agent_learning_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,
    task_id UUID REFERENCES agent_tasks(id),
    channel_id VARCHAR(100) DEFAULT 'world-knowledge',
    input_data JSONB,
    output_data JSONB,
    performance_metrics JSONB, -- 성능 지표
    user_feedback JSONB, -- 사용자 피드백
    quality_score INTEGER, -- 0-100
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_agent_learning_agent ON agent_learning_data(agent_type);
CREATE INDEX idx_agent_learning_channel ON agent_learning_data(channel_id);
CREATE INDEX idx_agent_learning_created ON agent_learning_data(created_at DESC);

-- 7. content_production_logs 테이블 (제작 로그)
CREATE TABLE IF NOT EXISTS content_production_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    log_type VARCHAR(50), -- 'info', 'warning', 'error', 'success'
    stage VARCHAR(50), -- 워크플로우 단계
    message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_production_logs_item ON content_production_logs(content_item_id);
CREATE INDEX idx_production_logs_type ON content_production_logs(log_type);
CREATE INDEX idx_production_logs_created ON content_production_logs(created_at DESC);

-- 8. channel_profiles 테이블 (채널 프로필 저장)
CREATE TABLE IF NOT EXISTS channel_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id VARCHAR(100) UNIQUE NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    profile_data JSONB NOT NULL, -- 전체 채널 프로필
    customizations JSONB DEFAULT '{}', -- 사용자 커스터마이징
    analytics JSONB DEFAULT '{}', -- 채널 분석 데이터
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_channel_profiles_channel ON channel_profiles(channel_id);
CREATE INDEX idx_channel_profiles_active ON channel_profiles(is_active);

-- 9. workflow_schedules 테이블 (자동화 스케줄)
CREATE TABLE IF NOT EXISTS workflow_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_name VARCHAR(255) NOT NULL,
    channel_id VARCHAR(100),
    schedule_type VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'custom'
    schedule_time TIME, -- 실행 시간 (예: 08:00:00)
    schedule_days INTEGER[], -- 요일 (1=월, 7=일) 또는 날짜
    workflow_config JSONB, -- 워크플로우 설정
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_workflow_schedules_active ON workflow_schedules(is_active);
CREATE INDEX idx_workflow_schedules_next ON workflow_schedules(next_run_at);

-- RLS (Row Level Security) 정책 설정
-- 모든 테이블에 RLS 활성화
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

-- 서비스 역할은 모든 데이터 접근 가능 (Netlify Functions용)
CREATE POLICY "Service role access" ON content_items FOR ALL USING (true);
CREATE POLICY "Service role access" ON agent_tasks FOR ALL USING (true);
CREATE POLICY "Service role access" ON content_research FOR ALL USING (true);
CREATE POLICY "Service role access" ON content_scripts FOR ALL USING (true);
CREATE POLICY "Service role access" ON content_storyboards FOR ALL USING (true);
CREATE POLICY "Service role access" ON agent_learning_data FOR ALL USING (true);
CREATE POLICY "Service role access" ON content_production_logs FOR ALL USING (true);
CREATE POLICY "Service role access" ON channel_profiles FOR ALL USING (true);
CREATE POLICY "Service role access" ON workflow_schedules FOR ALL USING (true);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 생성
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_agent_tasks_updated_at BEFORE UPDATE ON agent_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_content_research_updated_at BEFORE UPDATE ON content_research
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_content_scripts_updated_at BEFORE UPDATE ON content_scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_content_storyboards_updated_at BEFORE UPDATE ON content_storyboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_channel_profiles_updated_at BEFORE UPDATE ON channel_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_workflow_schedules_updated_at BEFORE UPDATE ON workflow_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();