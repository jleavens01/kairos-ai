-- TTS 오디오 파일 정보 저장 테이블
CREATE TABLE IF NOT EXISTS public.tts_audio (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  
  -- TTS 정보
  text TEXT NOT NULL,                    -- TTS로 변환된 텍스트
  voice_id VARCHAR(100),                 -- 사용된 음성 ID
  model_id VARCHAR(100),                 -- 사용된 모델 ID
  
  -- 파일 정보
  file_url TEXT NOT NULL,                -- Supabase Storage URL
  file_size INT,                         -- 파일 크기 (bytes)
  duration FLOAT,                        -- 오디오 길이 (초)
  
  -- 설정 정보
  voice_settings JSONB,                  -- 음성 설정 (stability, similarity_boost 등)
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- 버전별 유니크 제약
  UNIQUE(scene_id, version)
);

-- 인덱스 생성
CREATE INDEX idx_tts_audio_project_id ON public.tts_audio(project_id);
CREATE INDEX idx_tts_audio_scene_id ON public.tts_audio(scene_id);
CREATE INDEX idx_tts_audio_created_at ON public.tts_audio(created_at DESC);

-- RLS 정책
ALTER TABLE public.tts_audio ENABLE ROW LEVEL SECURITY;

-- 프로젝트 소유자/협업자만 조회 가능
CREATE POLICY "Users can view TTS audio for their projects" ON public.tts_audio
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

-- 프로젝트 소유자/협업자만 생성 가능
CREATE POLICY "Users can create TTS audio for their projects" ON public.tts_audio
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

-- 프로젝트 소유자/협업자만 수정 가능
CREATE POLICY "Users can update TTS audio for their projects" ON public.tts_audio
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

-- 프로젝트 소유자/협업자만 삭제 가능
CREATE POLICY "Users can delete TTS audio for their projects" ON public.tts_audio
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

-- 코멘트
COMMENT ON TABLE public.tts_audio IS 'TTS 오디오 파일 정보 저장';
COMMENT ON COLUMN public.tts_audio.project_id IS '프로젝트 ID';
COMMENT ON COLUMN public.tts_audio.scene_id IS '씬 ID (production_sheets 참조)';
COMMENT ON COLUMN public.tts_audio.version IS '버전 번호 (같은 씬에 대한 여러 버전 관리)';
COMMENT ON COLUMN public.tts_audio.text IS 'TTS로 변환된 텍스트';
COMMENT ON COLUMN public.tts_audio.voice_id IS 'ElevenLabs 음성 ID';
COMMENT ON COLUMN public.tts_audio.model_id IS 'ElevenLabs 모델 ID';
COMMENT ON COLUMN public.tts_audio.file_url IS 'Supabase Storage의 오디오 파일 URL';
COMMENT ON COLUMN public.tts_audio.voice_settings IS '음성 설정 JSON (stability, similarity_boost 등)';

-- updated_at 자동 업데이트 트리거 (이미 있을 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tts_audio_updated_at
  BEFORE UPDATE ON public.tts_audio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();