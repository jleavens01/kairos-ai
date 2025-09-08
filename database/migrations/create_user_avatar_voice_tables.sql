-- 사용자 포토 아바타 관리 테이블
CREATE TABLE IF NOT EXISTS user_photo_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  heygen_avatar_id VARCHAR(255) NOT NULL,
  avatar_type VARCHAR(20) NOT NULL DEFAULT 'custom', -- 'custom' | 'preset'
  heygen_type VARCHAR(20) NOT NULL DEFAULT 'talking_photo', -- 'avatar' | 'talking_photo'
  thumbnail_url TEXT,
  train_status VARCHAR(50) DEFAULT 'ready', -- ready, training, failed
  num_looks INTEGER DEFAULT 1,
  gender VARCHAR(20),
  tags TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 사용자 커스텀 음성 관리 테이블
CREATE TABLE IF NOT EXISTS user_custom_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  heygen_voice_id VARCHAR(255),
  elevenlabs_voice_id VARCHAR(255),
  provider VARCHAR(20) NOT NULL, -- 'heygen' | 'elevenlabs'
  language VARCHAR(10) DEFAULT 'ko',
  gender VARCHAR(20),
  preview_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 기존 gen_heygen_videos 테이블에 사용자 아바타/음성 참조 추가
ALTER TABLE gen_heygen_videos 
ADD COLUMN IF NOT EXISTS user_photo_avatar_id UUID REFERENCES user_photo_avatars(id),
ADD COLUMN IF NOT EXISTS user_custom_voice_id UUID REFERENCES user_custom_voices(id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_photo_avatars_user_type ON user_photo_avatars(user_id, avatar_type);
CREATE INDEX IF NOT EXISTS idx_user_photo_avatars_type ON user_photo_avatars(avatar_type);
CREATE INDEX IF NOT EXISTS idx_user_custom_voices_user ON user_custom_voices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_voices_provider ON user_custom_voices(provider);

-- RLS 정책 설정
ALTER TABLE user_photo_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_voices ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 아바타만 접근 가능 (프리셋은 모든 사용자 접근 가능)
CREATE POLICY "Users can view own avatars and presets" ON user_photo_avatars 
FOR SELECT USING (user_id = auth.uid() OR avatar_type = 'preset');

CREATE POLICY "Users can manage own avatars" ON user_photo_avatars 
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own voices" ON user_custom_voices 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own voices" ON user_custom_voices 
FOR ALL USING (user_id = auth.uid());

-- 샘플 데이터 (세모지 아바타)
INSERT INTO user_photo_avatars (user_id, name, heygen_avatar_id, avatar_type, heygen_type, thumbnail_url, train_status) 
VALUES (
  NULL, -- 테스트용 (실제로는 실제 user_id)
  '세모지',
  'f9ed7e3d4bc14f209094c8affd6e24d4',
  'custom',
  'talking_photo',
  'https://files2.heygen.ai/temporary_user_photar/7f0b851fb3e0475db9bc941ed8f8f63b/image.jpg',
  'ready'
) ON CONFLICT DO NOTHING;

-- 샘플 데이터 (세모지 음성)
INSERT INTO user_custom_voices (user_id, name, heygen_voice_id, provider, language) 
VALUES (
  NULL, -- 테스트용 (실제로는 실제 user_id)
  '세모지 음성',
  '436a8aa03edb42abbc44ca4b5320f784',
  'heygen',
  'ko'
) ON CONFLICT DO NOTHING;