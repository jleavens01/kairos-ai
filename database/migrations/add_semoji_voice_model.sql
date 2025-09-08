-- 세모지 HeyGen 음성 모델 추가
-- 먼저 UNIQUE 제약조건 추가 (존재하지 않는 경우에만)
ALTER TABLE voice_models 
ADD CONSTRAINT voice_models_voice_id_unique UNIQUE (voice_id);

-- 세모지 음성 데이터 삽입
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
  description,
  tags,
  is_active,
  is_premium,
  sort_order,
  category
) VALUES (
  '436a8aa03edb42abbc44ca4b5320f784',
  '세모지 음성 (HeyGen)',
  'heygen',
  'ko',
  'neutral',
  true,
  true,
  false,
  true,
  false,
  '세상의모든지식 전용 클론 음성',
  ARRAY['semoji', 'custom', 'korean', 'clone'],
  true,
  true,
  -20,
  'personal'
) ON CONFLICT (voice_id) DO UPDATE SET
  voice_name = EXCLUDED.voice_name,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();