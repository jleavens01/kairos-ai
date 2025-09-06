-- 사용자 커스텀 음성 즉시 추가
-- 현재 테이블에 커스텀 음성이 없으므로 직접 추가

-- 1. 한국어 커스텀 음성 추가
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
    
    -- ElevenLabs 전용 설정
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
) VALUES (
    'W7FnAxJNpD5WGjrF5GLp', -- 실제 ElevenLabs voice_id (현재 .env에서 사용 중인 ID)
    '사용자 한국어 음성 (커스텀)', 
    'elevenlabs', 
    'ko', 
    'Unspecified',
    false, -- ElevenLabs 클론 음성은 일반적으로 감정 지원 안함
    false,
    false,
    true,
    true, -- ElevenLabs는 다국어 지원
    
    -- ElevenLabs 설정
    'eleven_turbo_v2_5', -- 최신 모델 사용
    0.85, -- 클론 음성은 높은 유사성
    0.60, -- 안정성
    0.10, -- 낮은 스타일 강도 (자연스러움)
    
    'ElevenLabs로 클론된 사용자 커스텀 한국어 음성',
    ARRAY['custom', 'korean', 'clone', 'personal'],
    true, -- 활성화
    true, -- 프리미엄 (클론 음성)
    -10, -- 최상단 정렬 (음수로 우선순위)
    'personal' -- 개인 카테고리
);

-- 2. 영어 커스텀 음성 추가 (영어 버전도 있다면)
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
) VALUES (
    'W7FnAxJNpD5WGjrF5GLp', -- 영어도 같은 voice_id 사용 (다국어 지원)
    '사용자 영어 음성 (커스텀)', 
    'elevenlabs', 
    'en', 
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
    
    'ElevenLabs로 클론된 사용자 커스텀 영어 음성',
    ARRAY['custom', 'english', 'clone', 'personal'],
    true,
    true,
    -9, -- 두 번째 우선순위
    'personal'
);

-- 3. personal 카테고리용 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_voice_models_personal ON voice_models(category) WHERE category = 'personal';

-- 4. RLS 정책 설정 (Unrestricted 문제 해결)
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 조회 가능
CREATE POLICY "Anyone can view voice models" ON voice_models
    FOR SELECT 
    USING (true);

-- 인증된 사용자만 개인 음성 관리
CREATE POLICY "Authenticated users can manage personal voices" ON voice_models
    FOR ALL 
    TO authenticated
    USING (category = 'personal' OR auth.uid() IS NOT NULL)
    WITH CHECK (category = 'personal' OR auth.uid() IS NOT NULL);

-- 서비스 역할 전체 권한
CREATE POLICY "Service role full access" ON voice_models
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. 추가된 커스텀 음성 확인
SELECT 
    voice_id, 
    voice_name, 
    provider, 
    language, 
    category, 
    sort_order,
    is_active,
    is_premium
FROM voice_models 
WHERE category = 'personal' 
ORDER BY sort_order ASC;

-- 6. RLS 상태 확인
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE tablename = 'voice_models';

SELECT '커스텀 음성 추가 완료! HeyGen과 TTS에서 사용 가능합니다.' AS status;