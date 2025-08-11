-- gen_videos 테이블 생성
CREATE TABLE IF NOT EXISTS public.gen_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  production_sheet_id UUID REFERENCES public.production_sheets(id) ON DELETE SET NULL,
  
  -- 비디오 정보
  video_type VARCHAR(50), -- scene, character, background, etc.
  element_name VARCHAR(255),
  description TEXT,
  
  -- 생성 관련
  generation_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  generation_model VARCHAR(100), -- veo2, kling2.1, hailou02
  model_parameters JSONB, -- 모델별 파라미터
  prompt_used TEXT,
  custom_prompt TEXT,
  
  -- 입력 이미지/비디오
  reference_image_url TEXT,
  reference_video_url TEXT,
  
  -- 결과
  result_video_url TEXT,
  storage_video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds DECIMAL(10,2),
  fps INTEGER,
  resolution VARCHAR(20), -- 1920x1080, 1280x720, etc.
  
  -- 메타데이터
  request_id VARCHAR(255),
  metadata JSONB,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  
  -- 스타일
  style_id UUID REFERENCES public.styles(id) ON DELETE SET NULL,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- 인덱스용
  created_by UUID
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_gen_videos_project_id ON public.gen_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_gen_videos_production_sheet_id ON public.gen_videos(production_sheet_id);
CREATE INDEX IF NOT EXISTS idx_gen_videos_generation_status ON public.gen_videos(generation_status);
CREATE INDEX IF NOT EXISTS idx_gen_videos_generation_model ON public.gen_videos(generation_model);
CREATE INDEX IF NOT EXISTS idx_gen_videos_video_type ON public.gen_videos(video_type);
CREATE INDEX IF NOT EXISTS idx_gen_videos_created_at ON public.gen_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_videos_is_favorite ON public.gen_videos(is_favorite);
CREATE INDEX IF NOT EXISTS idx_gen_videos_style_id ON public.gen_videos(style_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.gen_videos ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 소유자만 CRUD 가능
CREATE POLICY "Users can view own project videos" ON public.gen_videos
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own project videos" ON public.gen_videos
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project videos" ON public.gen_videos
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project videos" ON public.gen_videos
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id = auth.uid()
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE public.gen_videos IS 'AI 생성 비디오 관리 테이블';
COMMENT ON COLUMN public.gen_videos.id IS '비디오 고유 ID';
COMMENT ON COLUMN public.gen_videos.project_id IS '프로젝트 ID';
COMMENT ON COLUMN public.gen_videos.production_sheet_id IS '연결된 프로덕션 시트 ID';
COMMENT ON COLUMN public.gen_videos.video_type IS '비디오 타입 (scene, character, background 등)';
COMMENT ON COLUMN public.gen_videos.element_name IS '요소 이름';
COMMENT ON COLUMN public.gen_videos.description IS '비디오 설명';
COMMENT ON COLUMN public.gen_videos.generation_status IS '생성 상태';
COMMENT ON COLUMN public.gen_videos.generation_model IS '사용된 AI 모델';
COMMENT ON COLUMN public.gen_videos.model_parameters IS '모델 파라미터';
COMMENT ON COLUMN public.gen_videos.prompt_used IS '실제 사용된 프롬프트';
COMMENT ON COLUMN public.gen_videos.custom_prompt IS '사용자 입력 프롬프트';
COMMENT ON COLUMN public.gen_videos.reference_image_url IS '참조 이미지 URL';
COMMENT ON COLUMN public.gen_videos.reference_video_url IS '참조 비디오 URL';
COMMENT ON COLUMN public.gen_videos.result_video_url IS 'AI 생성 결과 비디오 URL';
COMMENT ON COLUMN public.gen_videos.storage_video_url IS 'Supabase 스토리지 비디오 URL';
COMMENT ON COLUMN public.gen_videos.thumbnail_url IS '썸네일 이미지 URL';
COMMENT ON COLUMN public.gen_videos.duration_seconds IS '비디오 길이 (초)';
COMMENT ON COLUMN public.gen_videos.fps IS '초당 프레임 수';
COMMENT ON COLUMN public.gen_videos.resolution IS '해상도';
COMMENT ON COLUMN public.gen_videos.request_id IS 'AI API 요청 ID';
COMMENT ON COLUMN public.gen_videos.metadata IS '추가 메타데이터';
COMMENT ON COLUMN public.gen_videos.tags IS '태그 목록';
COMMENT ON COLUMN public.gen_videos.is_favorite IS '즐겨찾기 여부';
COMMENT ON COLUMN public.gen_videos.style_id IS '적용된 스타일 ID';
COMMENT ON COLUMN public.gen_videos.created_at IS '생성일시';
COMMENT ON COLUMN public.gen_videos.updated_at IS '수정일시';
COMMENT ON COLUMN public.gen_videos.completed_at IS '완료일시';
COMMENT ON COLUMN public.gen_videos.created_by IS '생성자 ID';