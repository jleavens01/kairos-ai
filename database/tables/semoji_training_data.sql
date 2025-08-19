-- 세모지 스타일 학습용 원고 데이터 테이블

-- UUID 확장 활성화 (이미 있으면 무시)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS semoji_training_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- 기본 정보
  title VARCHAR(500) NOT NULL,
  topic VARCHAR(500),
  video_id VARCHAR(100), -- YouTube 비디오 ID (있는 경우)
  episode_number INTEGER, -- 에피소드 번호 (있는 경우)
  
  -- 원고 내용
  intro TEXT, -- 도입부
  full_script TEXT NOT NULL, -- 전체 원고
  
  -- 스타일 정보
  style_notes TEXT, -- 스타일 특징 메모
  keywords TEXT[], -- 핵심 키워드들
  intro_type VARCHAR(100), -- 도입부 유형 (질문, 충격적 사실, 시간 대비 등)
  
  -- 구조 정보
  structure JSONB, -- 원고 구조 (도입, 배경, 핵심, 인사이트, 마무리 등)
  visual_cues TEXT[], -- 시각 자료 힌트
  duration_minutes INTEGER, -- 예상 시간(분)
  
  -- 메타데이터
  source VARCHAR(100) DEFAULT 'manual', -- manual, youtube, generated
  quality_score INTEGER, -- 품질 점수 (1-100)
  is_verified BOOLEAN DEFAULT false, -- 검증된 원고인지
  tags TEXT[], -- 태그들
  
  -- 학습 관련
  used_for_training BOOLEAN DEFAULT false, -- 학습에 사용되었는지
  training_feedback TEXT, -- 학습 결과 피드백
  
  -- 시간 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 인덱스
CREATE INDEX idx_semoji_training_title ON semoji_training_data(title);
CREATE INDEX idx_semoji_training_topic ON semoji_training_data(topic);
CREATE INDEX idx_semoji_training_quality ON semoji_training_data(quality_score);
CREATE INDEX idx_semoji_training_verified ON semoji_training_data(is_verified);
CREATE INDEX idx_semoji_training_used ON semoji_training_data(used_for_training);

-- RLS 정책
ALTER TABLE semoji_training_data ENABLE ROW LEVEL SECURITY;

-- 읽기는 모두 가능 (학습 데이터는 공유)
CREATE POLICY "Anyone can read semoji training data"
  ON semoji_training_data FOR SELECT
  USING (true);

-- 쓰기는 인증된 사용자만
CREATE POLICY "Authenticated users can insert semoji training data"
  ON semoji_training_data FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 수정은 작성자만
CREATE POLICY "Users can update their own semoji training data"
  ON semoji_training_data FOR UPDATE
  USING (auth.uid() = created_by);

-- 삭제는 작성자만
CREATE POLICY "Users can delete their own semoji training data"
  ON semoji_training_data FOR DELETE
  USING (auth.uid() = created_by);

-- 예시 데이터
INSERT INTO semoji_training_data (title, topic, intro, full_script, style_notes, keywords, intro_type, quality_score, is_verified)
VALUES 
(
  '스타벅스는 어떻게 세계 최고의 카페가 되었을까? | 하워드 슐츠의 놀라운 이야기',
  '스타벅스의 제3의 공간 철학',
  '여러분은 스타벅스에서 커피를 사신 적 있으신가요? 그런데 하워드 슐츠는 커피를 팔려고 한 게 아니었습니다. 그가 정말로 팔고 싶었던 것은 ''제3의 공간''이었죠.',
  '전체 원고 내용...',
  '질문 시작, 반전 활용, 핵심 개념 제시',
  ARRAY['스타벅스', '하워드 슐츠', '제3의 공간', '커피', '브랜드'],
  '질문',
  95,
  true
);