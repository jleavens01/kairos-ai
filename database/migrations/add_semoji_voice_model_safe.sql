-- 세모지 HeyGen 음성 모델 추가 (안전한 방법)

-- 1. 기존 세모지 음성이 있다면 삭제
DELETE FROM voice_models WHERE voice_id = '436a8aa03edb42abbc44ca4b5320f784';

-- 2. 세모지 음성 데이터 삽입
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
);

-- 3. 확인 쿼리
SELECT voice_id, voice_name, provider, language, sort_order, category 
FROM voice_models 
WHERE voice_id = '436a8aa03edb42abbc44ca4b5320f784';