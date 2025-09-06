-- 사용자 커스텀 음성 간단 추가 스크립트
-- 실제 ElevenLabs voice_id를 알고 있다면 아래에서 변경하세요

-- 현재 voice_models 테이블 상태 확인
SELECT COUNT(*) as total_voices, 
       COUNT(*) FILTER (WHERE category = 'personal') as personal_voices
FROM voice_models;

-- 커스텀 음성 추가 (실제 voice_id로 변경 필요)
INSERT INTO voice_models (
    voice_id, 
    voice_name, 
    provider, 
    language, 
    gender,
    supports_emotion,
    supports_pause,
    supports_pitch,
    supports_speed,
    supports_multilingual,
    elevenlabs_model,
    default_similarity_boost,
    default_stability,
    default_style,
    description,
    tags,
    is_active,
    is_premium,
    sort_order,
    category
) 
SELECT 
    'YOUR_ACTUAL_ELEVENLABS_VOICE_ID_HERE', -- ← 이 부분을 실제 voice_id로 변경
    '내 목소리 (커스텀)', 
    'elevenlabs', 
    'ko', 
    'Unspecified',
    false,
    false,
    false,
    true,
    true,
    'eleven_turbo_v2_5',
    0.85,
    0.60,
    0.10,
    '사용자 개인 클론 음성 (한국어)',
    ARRAY['custom', 'personal', 'clone'],
    true,
    true,
    -10, -- 최상단 표시
    'personal'
WHERE NOT EXISTS (
    SELECT 1 FROM voice_models 
    WHERE voice_name LIKE '%내 목소리%' OR category = 'personal'
);

-- RLS 설정 (Unrestricted 해결)
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;

-- 기본 조회 정책 (모든 사용자가 음성 목록 볼 수 있음)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_models' AND policyname = 'voice_models_select_policy'
    ) THEN
        CREATE POLICY voice_models_select_policy ON voice_models FOR SELECT USING (true);
    END IF;
END $$;

-- 서비스 역할 전체 권한 (앱이 작동하도록)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_models' AND policyname = 'voice_models_service_policy'
    ) THEN
        CREATE POLICY voice_models_service_policy ON voice_models 
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 결과 확인
SELECT 
    voice_id, 
    voice_name, 
    provider, 
    language, 
    category,
    sort_order,
    is_active
FROM voice_models 
ORDER BY 
    CASE WHEN category = 'personal' THEN 0 ELSE 1 END,
    sort_order ASC, 
    voice_name ASC;

-- RLS 상태 확인
SELECT 
    tablename, 
    rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE tablename = 'voice_models';

-- 성공 메시지
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM voice_models WHERE category = 'personal') 
        THEN '✅ 커스텀 음성이 추가되었습니다!'
        ELSE '❌ voice_id를 실제 값으로 변경해주세요'
    END as status;