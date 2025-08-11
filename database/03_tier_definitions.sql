-- 티어 정의 테이블 생성 및 기본 데이터 삽입
CREATE TABLE IF NOT EXISTS tier_definitions (
  id VARCHAR(20) PRIMARY KEY,
  display_name VARCHAR(50) NOT NULL,
  
  -- 크레딧 설정
  monthly_credits INTEGER NOT NULL,
  credit_price_per_100 DECIMAL(10,2), -- 100 크레딧당 추가 구매 가격
  
  -- 제한 설정
  max_projects INTEGER NOT NULL,
  max_storage_mb INTEGER NOT NULL,
  max_ai_requests_daily INTEGER NOT NULL,
  max_collaborators_per_project INTEGER NOT NULL,
  
  -- 기능 설정
  features JSONB NOT NULL,
  
  -- 가격 설정
  monthly_price DECIMAL(10,2) DEFAULT 0,
  yearly_price DECIMAL(10,2) DEFAULT 0,
  
  -- 표시 설정
  badge_color VARCHAR(7), -- HEX 색상 코드
  is_popular BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 데이터 삭제 (중복 방지)
DELETE FROM tier_definitions;

-- 티어 데이터 삽입
INSERT INTO tier_definitions (
  id, display_name, monthly_credits, credit_price_per_100,
  max_projects, max_storage_mb, max_ai_requests_daily, max_collaborators_per_project,
  features, monthly_price, yearly_price, badge_color, is_popular, sort_order
) VALUES
(
  'free',
  'Free',
  100,
  5.00,  -- 추가 크레딧 구매 시 100개당 $5
  3,     -- 최대 3개 프로젝트
  500,   -- 500MB 저장 공간
  10,    -- 일일 10회 AI 요청
  0,     -- 협업 불가
  '{
    "basic_ai": true,
    "export": false,
    "priority_support": false,
    "custom_branding": false,
    "api_access": false,
    "advanced_ai_models": false
  }',
  0.00,
  0.00,
  '#6c757d',
  false,
  1
),
(
  'basic',
  'Basic',
  500,
  4.00,  -- 추가 크레딧 구매 시 100개당 $4
  10,    -- 최대 10개 프로젝트
  2000,  -- 2GB 저장 공간
  50,    -- 일일 50회 AI 요청
  3,     -- 프로젝트당 3명 협업
  '{
    "basic_ai": true,
    "export": true,
    "priority_support": false,
    "custom_branding": false,
    "api_access": false,
    "advanced_ai_models": false,
    "email_support": true
  }',
  9.99,
  99.99,  -- 연간 결제 시 2개월 무료
  '#28a745',
  false,
  2
),
(
  'pro',
  'Pro',
  2000,
  3.00,   -- 추가 크레딧 구매 시 100개당 $3
  50,     -- 최대 50개 프로젝트
  10000,  -- 10GB 저장 공간
  200,    -- 일일 200회 AI 요청
  10,     -- 프로젝트당 10명 협업
  '{
    "basic_ai": true,
    "export": true,
    "priority_support": true,
    "custom_branding": true,
    "api_access": true,
    "advanced_ai_models": true,
    "email_support": true,
    "priority_queue": true,
    "webhooks": true
  }',
  29.99,
  299.99,  -- 연간 결제 시 2.5개월 무료
  '#007bff',
  true,    -- 가장 인기 있는 플랜
  3
),
(
  'enterprise',
  'Enterprise',
  99999,  -- 사실상 무제한
  2.00,   -- 추가 크레딧 구매 시 100개당 $2 (최저가)
  99999,  -- 무제한
  99999,  -- 무제한
  99999,  -- 무제한
  99999,  -- 무제한
  '{
    "all": true,
    "dedicated_support": true,
    "sla": true,
    "custom_integration": true,
    "white_label": true,
    "on_premise": true,
    "training": true
  }',
  99.99,
  999.99,  -- 연간 결제 시 특별 할인
  '#6610f2',
  false,
  4
);

-- 티어별 크레딧 사용량 정의 테이블
CREATE TABLE IF NOT EXISTS credit_costs (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL,
  operation_name VARCHAR(100) NOT NULL,
  credit_cost INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 크레딧 비용 데이터 삽입
DELETE FROM credit_costs;
INSERT INTO credit_costs (operation_type, operation_name, credit_cost, description) VALUES
('text', 'short_text_generation', 1, '500자 이하 텍스트 생성'),
('text', 'medium_text_generation', 3, '500-2000자 텍스트 생성'),
('text', 'long_text_generation', 5, '2000자 이상 텍스트 생성'),
('image', 'image_generation_sd', 5, '표준 화질 이미지 생성'),
('image', 'image_generation_hd', 10, '고화질 이미지 생성'),
('image', 'image_generation_4k', 20, '4K 이미지 생성'),
('video', 'video_generation_short', 20, '30초 이하 비디오 생성'),
('video', 'video_generation_medium', 50, '30-60초 비디오 생성'),
('video', 'video_generation_long', 100, '60초 이상 비디오 생성'),
('audio', 'voice_generation', 3, '음성 생성 (1분당)'),
('audio', 'music_generation', 10, '음악 생성 (1분당)'),
('analysis', 'content_analysis', 2, '콘텐츠 분석'),
('translation', 'text_translation', 2, '텍스트 번역 (1000자당)');

-- 티어 업그레이드 이력 테이블
CREATE TABLE IF NOT EXISTS tier_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  from_tier VARCHAR(20),
  to_tier VARCHAR(20) NOT NULL,
  reason VARCHAR(100),
  upgraded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tier_history_profile_id ON tier_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_tier_history_upgraded_at ON tier_history(upgraded_at DESC);

-- 티어 정보 조회 뷰
CREATE OR REPLACE VIEW user_tier_info AS
SELECT 
  p.user_id,
  p.email,
  p.nickname,
  p.tier,
  td.display_name as tier_name,
  td.monthly_credits,
  p.credits as current_credits,
  td.max_projects,
  p.total_projects as current_projects,
  td.max_storage_mb,
  p.storage_used_mb as current_storage,
  td.max_ai_requests_daily,
  td.monthly_price,
  td.features,
  p.tier_expires_at
FROM profiles p
LEFT JOIN tier_definitions td ON p.tier = td.id;