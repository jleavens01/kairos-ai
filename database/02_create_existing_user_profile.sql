-- 기존 사용자를 위한 프로필 생성 SQL
-- auth.users 테이블에 있지만 profiles 테이블에 없는 사용자의 프로필을 생성합니다

-- 1. 현재 사용자 확인 (먼저 이것을 실행해서 user_id를 확인하세요)
SELECT id, email, raw_user_meta_data->>'full_name' as name, raw_user_meta_data->>'avatar_url' as avatar
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles);

-- 2. 모든 기존 사용자에 대해 프로필 자동 생성
INSERT INTO profiles (user_id, email, display_name, avatar_url, credits, tier, max_projects)
SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as display_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    100 as credits,  -- 기본 크레딧
    'free' as tier,   -- 기본 티어
    3 as max_projects -- 기본 프로젝트 수 제한
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles);

-- 3. 특정 사용자만 프로필 생성하기 (이메일로)
-- 본인의 이메일로 변경하세요
INSERT INTO profiles (user_id, email, display_name, avatar_url)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE email = 'your-email@gmail.com'  -- 여기에 본인 이메일 입력
AND id NOT IN (SELECT user_id FROM profiles);

-- 4. 프로필이 제대로 생성되었는지 확인
SELECT 
    p.*,
    u.email as auth_email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- 5. 만약 이미 프로필이 있는데 초기값을 리셋하고 싶다면
UPDATE profiles
SET 
    credits = 100,
    tier = 'free',
    max_projects = 3,
    max_storage_mb = 500,
    max_ai_requests_daily = 10
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@gmail.com');

-- 6. 현재 로그인한 사용자의 프로필 조회 (Supabase에서 바로 사용 가능)
SELECT * FROM profiles WHERE user_id = auth.uid();