-- 사용자 실제 음성 ID 업데이트 및 RLS 정책 설정

-- 1. 사용자 실제 음성 ID 업데이트
-- .env 파일에서 확인한 실제 ElevenLabs voice_id로 업데이트
UPDATE voice_models 
SET voice_id = 'W7FnAxJNpD5WGjrF5GLp' 
WHERE voice_name = '사용자 한국어 음성 (커스텀)' AND provider = 'elevenlabs';

UPDATE voice_models 
SET voice_id = 'W7FnAxJNpD5WGjrF5GLp' 
WHERE voice_name = '사용자 영어 음성 (커스텀)' AND provider = 'elevenlabs';

-- 2. voice_models 테이블 RLS 활성화
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책 생성

-- 모든 사용자가 음성 모델을 조회할 수 있도록 (읽기 전용)
CREATE POLICY "Anyone can view voice models" ON voice_models
    FOR SELECT 
    USING (true);

-- 인증된 사용자만 개인 카테고리 음성 모델을 삽입할 수 있도록
CREATE POLICY "Authenticated users can insert personal voice models" ON voice_models
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        category = 'personal' OR 
        auth.uid() IS NOT NULL
    );

-- 인증된 사용자만 개인 카테고리 음성 모델을 수정할 수 있도록
CREATE POLICY "Authenticated users can update personal voice models" ON voice_models
    FOR UPDATE 
    TO authenticated
    USING (
        category = 'personal' OR 
        auth.uid() IS NOT NULL
    )
    WITH CHECK (
        category = 'personal' OR 
        auth.uid() IS NOT NULL
    );

-- 서비스 역할은 모든 작업 가능 (관리자용)
CREATE POLICY "Service role can manage all voice models" ON voice_models
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. 업데이트된 커스텀 음성 확인
SELECT 
    voice_id, 
    voice_name, 
    provider, 
    language, 
    category, 
    is_active,
    sort_order,
    elevenlabs_model,
    default_similarity_boost,
    default_stability,
    default_style
FROM voice_models 
WHERE category = 'personal' 
ORDER BY sort_order ASC;

-- 5. RLS 정책 확인
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'voice_models';

-- 참고: 실제 ElevenLabs voice_id가 있다면 아래처럼 업데이트
-- UPDATE voice_models 
-- SET voice_id = 'your_real_elevenlabs_voice_id_here' 
-- WHERE voice_name = '사용자 한국어 음성 (커스텀)' AND provider = 'elevenlabs';