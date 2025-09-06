-- 사용자 실제 음성 ID 빠른 업데이트 스크립트
-- 실제 ElevenLabs voice_id로 변경하여 실행하세요

-- 현재 커스텀 음성 상태 확인
SELECT 
    voice_id, 
    voice_name, 
    provider, 
    language, 
    category,
    is_active
FROM voice_models 
WHERE category = 'personal' AND provider = 'elevenlabs';

-- 실제 voice_id로 업데이트 (아래 ID를 실제 값으로 변경)
-- 예시: UPDATE voice_models SET voice_id = 'pNInz6obpgDQGcFmaJgB' 

-- 한국어 커스텀 음성 업데이트
UPDATE voice_models 
SET 
    voice_id = 'W7FnAxJNpD5WGjrF5GLp', -- 실제 ElevenLabs voice_id로 변경
    updated_at = NOW()
WHERE voice_name = '사용자 한국어 음성 (커스텀)' 
    AND provider = 'elevenlabs' 
    AND category = 'personal';

-- 영어 커스텀 음성 업데이트 (영어 버전이 있다면)
UPDATE voice_models 
SET 
    voice_id = 'W7FnAxJNpD5WGjrF5GLp', -- 실제 ElevenLabs voice_id로 변경
    updated_at = NOW()
WHERE voice_name = '사용자 영어 음성 (커스텀)' 
    AND provider = 'elevenlabs' 
    AND category = 'personal';

-- 업데이트 결과 확인
SELECT 
    voice_id, 
    voice_name, 
    provider, 
    language, 
    category,
    is_active,
    updated_at
FROM voice_models 
WHERE category = 'personal' AND provider = 'elevenlabs'
ORDER BY sort_order ASC;

-- TTS 생성 테스트를 위한 확인 쿼리
SELECT 
    voice_id,
    elevenlabs_model,
    default_similarity_boost,
    default_stability,
    default_style
FROM voice_models 
WHERE category = 'personal' 
    AND provider = 'elevenlabs' 
    AND language = 'ko' 
    AND is_active = true;

-- 성공 메시지 출력
SELECT 'Voice ID updated successfully! TTS function will now use your custom voice.' AS status;