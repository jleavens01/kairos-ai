-- 보이스 모델 관리 테이블
CREATE TABLE IF NOT EXISTS voice_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 기본 정보
    voice_id VARCHAR(255) NOT NULL,
    voice_name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'heygen', 'elevenlabs', 'azure', 'openai' 등
    language VARCHAR(10) NOT NULL, -- 'ko', 'en', 'ja' 등
    gender VARCHAR(20), -- 'Male', 'Female', 'Neutral'
    
    -- 지원 기능
    supports_emotion BOOLEAN DEFAULT false,
    supports_pause BOOLEAN DEFAULT false,
    supports_pitch BOOLEAN DEFAULT false,
    supports_speed BOOLEAN DEFAULT true,
    supports_multilingual BOOLEAN DEFAULT false,
    
    -- 감정 및 로캘 지원
    supported_emotions TEXT[], -- ['Excited', 'Friendly', 'Serious', 'Soothing', 'Broadcaster']
    supported_locales TEXT[], -- ['en-US', 'en-IN', 'pt-PT', 'pt-BR'] 등
    
    -- ElevenLabs 전용 설정
    elevenlabs_model VARCHAR(100), -- 'eleven_turbo_v2_5', 'eleven_multilingual_v2' 등
    default_similarity_boost DECIMAL(3,2) DEFAULT 0.75, -- 0.0 ~ 1.0
    default_stability DECIMAL(3,2) DEFAULT 0.50, -- 0.0 ~ 1.0  
    default_style DECIMAL(3,2) DEFAULT 0.00, -- 0.0 ~ 1.0
    
    -- 미리보기 및 메타데이터
    preview_audio_url TEXT,
    description TEXT,
    tags TEXT[],
    
    -- 활성화 및 프리미엄 여부
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,
    
    -- 정렬 및 카테고리
    sort_order INTEGER DEFAULT 0,
    category VARCHAR(50), -- 'news', 'casual', 'professional', 'character' 등
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_voice_models_provider ON voice_models(provider);
CREATE INDEX IF NOT EXISTS idx_voice_models_language ON voice_models(language);
CREATE INDEX IF NOT EXISTS idx_voice_models_active ON voice_models(is_active);
CREATE INDEX IF NOT EXISTS idx_voice_models_category ON voice_models(category);

-- 샘플 데이터 삽입 (HeyGen + ElevenLabs)
INSERT INTO voice_models (voice_id, voice_name, provider, language, gender, supports_emotion, supports_pause, category, description) VALUES
-- HeyGen 기본 음성들
('heygen_ko_female_01', '지수 (여성)', 'heygen', 'ko', 'Female', true, true, 'professional', 'HeyGen 한국어 여성 음성'),
('heygen_ko_male_01', '민호 (남성)', 'heygen', 'ko', 'Male', false, true, 'professional', 'HeyGen 한국어 남성 음성'),
('heygen_en_female_01', 'Emma (Female)', 'heygen', 'en', 'Female', true, true, 'professional', 'HeyGen English female voice'),
('heygen_en_male_01', 'James (Male)', 'heygen', 'en', 'Male', false, false, 'professional', 'HeyGen English male voice'),

-- ElevenLabs 음성들 (예시)
('elevenlabs_rachel', 'Rachel', 'elevenlabs', 'en', 'Female', false, false, 'professional', 'ElevenLabs professional female voice'),
('elevenlabs_drew', 'Drew', 'elevenlabs', 'en', 'Male', false, false, 'casual', 'ElevenLabs casual male voice'),
('elevenlabs_clyde', 'Clyde', 'elevenlabs', 'en', 'Male', false, false, 'character', 'ElevenLabs character voice'),
('elevenlabs_bella', 'Bella', 'elevenlabs', 'en', 'Female', false, false, 'news', 'ElevenLabs news anchor voice');

-- ElevenLabs 음성들에 모델 정보 업데이트
UPDATE voice_models SET 
    elevenlabs_model = 'eleven_turbo_v2_5',
    supports_multilingual = true,
    supported_locales = ARRAY['en-US', 'en-GB', 'en-AU'],
    default_similarity_boost = 0.75,
    default_stability = 0.50,
    default_style = 0.00
WHERE provider = 'elevenlabs';

-- 감정 지원 음성들에 감정 목록 추가
UPDATE voice_models SET 
    supported_emotions = ARRAY['Excited', 'Friendly', 'Serious', 'Soothing', 'Broadcaster']
WHERE supports_emotion = true;

-- 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_voice_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_voice_models_updated_at
    BEFORE UPDATE ON voice_models
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_models_updated_at();