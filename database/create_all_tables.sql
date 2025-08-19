-- AI Content Production System - 전체 테이블 생성 스크립트
-- 이 파일을 Supabase SQL Editor에서 한 번에 실행하여 모든 테이블을 생성할 수 있습니다.

-- ========================================
-- 0. 필수 함수 설정
-- ========================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 1. content_items 테이블 (뉴스 수집 및 콘텐츠 아이템)
-- ========================================

CREATE TABLE IF NOT EXISTS content_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    source_url TEXT,
    source_type VARCHAR(50), -- news, trending, manual
    category VARCHAR(100),
    score DECIMAL(3, 2), -- 0.00 ~ 1.00
    selected_for_production BOOLEAN DEFAULT false,
    workflow_stage VARCHAR(50) DEFAULT 'collected', -- collected, researching, writing, storyboarding, production, completed
    metadata JSONB DEFAULT '{}', -- 키워드, 평가 이유, 추가 정보 등
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_content_items_selected ON content_items(selected_for_production);
CREATE INDEX idx_content_items_stage ON content_items(workflow_stage);
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

-- ========================================
-- 2. agent_tasks 테이블 (AI 에이전트 작업 관리)
-- ========================================

CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL, -- researcher, writer, visual_director, etc.
    task_type VARCHAR(100) NOT NULL, -- research, write_script, generate_storyboard, etc.
    priority INTEGER DEFAULT 50, -- 0-100, 높을수록 우선
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
    input_data JSONB, -- 작업 입력 데이터
    output_data JSONB, -- 작업 결과 데이터
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_priority ON agent_tasks(priority DESC);
CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agent_type);

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

-- ========================================
-- 3. content_research 테이블 (연구 데이터)
-- ========================================

CREATE TABLE IF NOT EXISTS content_research (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    agent_task_id UUID REFERENCES agent_tasks(id),
    research_data JSONB NOT NULL, -- 전체 연구 결과
    sources TEXT[], -- 참고 자료 URL들
    facts TEXT[], -- 핵심 사실들
    statistics JSONB, -- 통계 자료
    quotes TEXT[], -- 인용문들
    visual_ideas TEXT[], -- 시각화 아이디어
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

-- ========================================
-- 4. content_scripts 테이블 (원고)
-- ========================================

CREATE TABLE IF NOT EXISTS content_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    content_research_id UUID REFERENCES content_research(id),
    agent_task_id UUID REFERENCES agent_tasks(id),
    script_data JSONB NOT NULL, -- 전체 원고 구조
    scenes JSONB[], -- 씬별 원고
    narration TEXT, -- 내레이션 전문
    keywords TEXT[], -- SEO 키워드
    tone_and_manner VARCHAR(100), -- 톤앤매너
    estimated_duration VARCHAR(50), -- 예상 시간
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_content_scripts_item ON content_scripts(content_item_id);
CREATE INDEX idx_content_scripts_research ON content_scripts(content_research_id);

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

-- ========================================
-- 5. content_storyboards 테이블 (스토리보드)
-- ========================================

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

-- ========================================
-- 6. channel_profiles 테이블 (채널 프로필 저장)
-- ========================================

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

-- RLS 활성화
ALTER TABLE channel_profiles ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책
CREATE POLICY "Service role access for channel_profiles" ON channel_profiles 
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_channel_profiles_updated_at 
    BEFORE UPDATE ON channel_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 완료 메시지
-- ========================================

-- 테이블 생성 확인
DO $$
BEGIN
    RAISE NOTICE 'AI Content Production 테이블이 성공적으로 생성되었습니다!';
    RAISE NOTICE '생성된 테이블:';
    RAISE NOTICE '  - content_items: 뉴스 및 콘텐츠 아이템';
    RAISE NOTICE '  - agent_tasks: AI 에이전트 작업 관리';
    RAISE NOTICE '  - content_research: 연구 데이터';
    RAISE NOTICE '  - content_scripts: 원고 데이터';
    RAISE NOTICE '  - content_storyboards: 스토리보드';
    RAISE NOTICE '  - channel_profiles: 채널 프로필';
END $$;