-- production_sheets 테이블 생성
-- 연출정리표 (씬별 정보) 저장

CREATE TABLE IF NOT EXISTS public.production_sheets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_number INT NOT NULL,
  original_script_text TEXT,
  format VARCHAR(50) DEFAULT 'mixed', -- 'infographic' 또는 'data' 또는 'mixed'
  characters TEXT[] DEFAULT '{}',  -- 캐릭터 목록
  backgrounds TEXT[] DEFAULT '{}', -- 배경 목록
  props TEXT[] DEFAULT '{}',       -- 소품 목록
  director_guide TEXT,             -- 연출 가이드
  image_prompt TEXT,               -- JSON 형식의 이미지 프롬프트
  video_prompt TEXT,               -- 비디오 프롬프트
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 인덱스를 위한 복합 유니크 제약
  UNIQUE(project_id, scene_number)
);

-- 인덱스 생성
CREATE INDEX idx_production_sheets_project_id ON public.production_sheets(project_id);
CREATE INDEX idx_production_sheets_scene_number ON public.production_sheets(scene_number);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.production_sheets ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 소유자만 접근 가능
CREATE POLICY "Users can view their own production sheets" ON public.production_sheets
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own production sheets" ON public.production_sheets
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own production sheets" ON public.production_sheets
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own production sheets" ON public.production_sheets
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE public.production_sheets IS '프로젝트별 연출정리표 (씬 정보)';
COMMENT ON COLUMN public.production_sheets.project_id IS '프로젝트 ID (외래키)';
COMMENT ON COLUMN public.production_sheets.scene_number IS '씬 번호';
COMMENT ON COLUMN public.production_sheets.original_script_text IS '원본 스크립트 텍스트';
COMMENT ON COLUMN public.production_sheets.format IS '생성 형식: infographic(인포그래픽), data(자료), mixed(혼합)';
COMMENT ON COLUMN public.production_sheets.characters IS '씬에 등장하는 캐릭터 목록';
COMMENT ON COLUMN public.production_sheets.backgrounds IS '씬의 배경 목록';
COMMENT ON COLUMN public.production_sheets.props IS '씬에 필요한 소품 목록';
COMMENT ON COLUMN public.production_sheets.director_guide IS '연출 가이드';
COMMENT ON COLUMN public.production_sheets.image_prompt IS 'AI 이미지 생성용 프롬프트 (JSON)';
COMMENT ON COLUMN public.production_sheets.video_prompt IS 'AI 비디오 생성용 프롬프트';

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_production_sheets_updated_at
  BEFORE UPDATE ON public.production_sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();