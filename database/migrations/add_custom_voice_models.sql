-- 커스텀 보이스 모델 추가 (ElevenLabs 사용자 목소리)
-- 기존 voice_models 테이블에 사용자 클론 보이스 추가

-- 사용자 클론 목소리 추가 (예시 - 실제 voice_id로 교체 필요)
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
    'elevenlabs_custom_korean_voice', -- 실제 ElevenLabs voice_id로 교체
    '사용자 한국어 음성 (커스텀)', 
    'elevenlabs', 
    'ko', 
    'Unspecified', -- 또는 실제 성별
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
),
(
    'elevenlabs_custom_english_voice', -- 영어 버전이 있다면
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

-- 'personal' 카테고리용 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_voice_models_personal ON voice_models(category) WHERE category = 'personal';

-- 커스텀 음성 확인 쿼리 (실행 후 확인용)
-- SELECT voice_id, voice_name, provider, language, category, sort_order 
-- FROM voice_models 
-- WHERE category = 'personal' 
-- ORDER BY sort_order ASC;

-- 실제 사용 시 아래 명령으로 voice_id 업데이트 필요:
-- 예시: ElevenLabs에서 클론한 실제 voice_id로 업데이트
-- UPDATE voice_models 
-- SET voice_id = 'your_actual_elevenlabs_voice_id_here' 
-- WHERE voice_name = '사용자 한국어 음성 (커스텀)' AND provider = 'elevenlabs';

-- UPDATE voice_models 
-- SET voice_id = 'your_actual_elevenlabs_voice_id_here' 
-- WHERE voice_name = '사용자 영어 음성 (커스텀)' AND provider = 'elevenlabs';

-- 업데이트 후 TTS 생성 함수가 자동으로 실제 voice_id를 사용합니다.

-- 지원 로케일 업데이트 (필요한 경우)
-- UPDATE voice_models 
-- SET supported_locales = ARRAY['ko-KR', 'en-US'] 
-- WHERE category = 'personal' AND provider = 'elevenlabs';