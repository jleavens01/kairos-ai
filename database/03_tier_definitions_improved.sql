-- 개선된 티어 정의 (NULL = 무제한)
-- profiles 테이블의 제한 필드들도 NULL 허용으로 수정 필요

-- 먼저 profiles 테이블 컬럼 수정 (NULL 허용)
ALTER TABLE profiles 
  ALTER COLUMN max_projects DROP NOT NULL,
  ALTER COLUMN max_storage_mb DROP NOT NULL,
  ALTER COLUMN max_ai_requests_daily DROP NOT NULL,
  ALTER COLUMN max_collaborators_per_project DROP NOT NULL;

-- tier_definitions 테이블도 NULL 허용으로 수정
ALTER TABLE tier_definitions 
  ALTER COLUMN max_projects DROP NOT NULL,
  ALTER COLUMN max_storage_mb DROP NOT NULL,
  ALTER COLUMN max_ai_requests_daily DROP NOT NULL,
  ALTER COLUMN max_collaborators_per_project DROP NOT NULL;

-- 기존 데이터 삭제
DELETE FROM tier_definitions;

-- 개선된 티어 데이터 삽입 (NULL = 무제한)
INSERT INTO tier_definitions (
  id, display_name, monthly_credits, credit_price_per_100,
  max_projects, max_storage_mb, max_ai_requests_daily, max_collaborators_per_project,
  features, monthly_price, yearly_price, badge_color, is_popular, sort_order
) VALUES
(
  'free',
  'Free',
  100,
  5.00,
  3,      -- 최대 3개 프로젝트
  500,    -- 500MB
  10,     -- 일일 10회
  0,      -- 협업 불가
  '{"basic_ai": true, "export": false}',
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
  4.00,
  10,     -- 최대 10개 프로젝트
  2000,   -- 2GB
  50,     -- 일일 50회
  3,      -- 3명 협업
  '{"basic_ai": true, "export": true, "email_support": true}',
  9.99,
  99.99,
  '#28a745',
  false,
  2
),
(
  'pro',
  'Pro',
  2000,
  3.00,
  50,      -- 최대 50개 프로젝트
  10000,   -- 10GB
  200,     -- 일일 200회
  10,      -- 10명 협업
  '{"advanced_ai": true, "export": true, "priority": true, "api_access": true}',
  29.99,
  299.99,
  '#007bff',
  true,
  3
),
(
  'enterprise',
  'Enterprise',
  NULL,    -- 무제한 크레딧
  2.00,
  NULL,    -- 무제한 프로젝트
  NULL,    -- 무제한 저장공간
  NULL,    -- 무제한 AI 요청
  NULL,    -- 무제한 협업자
  '{"all": true, "dedicated_support": true, "sla": true, "custom": true}',
  99.99,
  999.99,
  '#6610f2',
  false,
  4
);

-- 제한 확인 함수 (NULL을 무제한으로 처리)
CREATE OR REPLACE FUNCTION check_limit(current_value INTEGER, max_value INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- max_value가 NULL이면 무제한이므로 항상 true
  IF max_value IS NULL THEN
    RETURN true;
  END IF;
  
  -- 현재 값이 최대값보다 작으면 true
  RETURN current_value < max_value;
END;
$$ LANGUAGE plpgsql;

-- 사용자가 프로젝트를 생성할 수 있는지 확인하는 함수
CREATE OR REPLACE FUNCTION can_create_project(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_projects INTEGER;
  v_current_projects INTEGER;
BEGIN
  SELECT max_projects, total_projects 
  INTO v_max_projects, v_current_projects
  FROM profiles 
  WHERE user_id = user_uuid;
  
  -- max_projects가 NULL이면 무제한
  IF v_max_projects IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_current_projects < v_max_projects;
END;
$$ LANGUAGE plpgsql;

-- 남은 크레딧/프로젝트 수 등을 표시하는 뷰
CREATE OR REPLACE VIEW user_limits_display AS
SELECT 
  p.user_id,
  p.email,
  p.nickname,
  p.tier,
  
  -- 크레딧 표시
  CASE 
    WHEN td.monthly_credits IS NULL THEN '무제한'
    ELSE td.monthly_credits::TEXT
  END as monthly_credits_display,
  
  -- 프로젝트 제한 표시
  CASE 
    WHEN td.max_projects IS NULL THEN '무제한'
    ELSE td.max_projects::TEXT || '개'
  END as max_projects_display,
  
  -- 저장공간 표시
  CASE 
    WHEN td.max_storage_mb IS NULL THEN '무제한'
    WHEN td.max_storage_mb >= 1000 THEN (td.max_storage_mb / 1000)::TEXT || ' GB'
    ELSE td.max_storage_mb::TEXT || ' MB'
  END as storage_display,
  
  -- AI 요청 표시
  CASE 
    WHEN td.max_ai_requests_daily IS NULL THEN '무제한'
    ELSE '일일 ' || td.max_ai_requests_daily::TEXT || '회'
  END as ai_requests_display,
  
  -- 협업자 표시
  CASE 
    WHEN td.max_collaborators_per_project IS NULL THEN '무제한'
    WHEN td.max_collaborators_per_project = 0 THEN '협업 불가'
    ELSE td.max_collaborators_per_project::TEXT || '명'
  END as collaborators_display,
  
  -- 남은 프로젝트 수
  CASE 
    WHEN td.max_projects IS NULL THEN '무제한'
    ELSE (td.max_projects - p.total_projects)::TEXT || '개 남음'
  END as remaining_projects
  
FROM profiles p
LEFT JOIN tier_definitions td ON p.tier = td.id;