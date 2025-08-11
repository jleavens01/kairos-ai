-- gen_images 테이블 생성
-- AI로 생성된 이미지 관리 (씬별, 요소별 여러 버전)

CREATE TABLE IF NOT EXISTS public.gen_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  production_sheet_id UUID REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  
  -- 이미지 타입 및 관련 정보
  image_type VARCHAR(50) NOT NULL, -- 'scene', 'character', 'background', 'prop'
  element_code VARCHAR(10),         -- 요소 코드 (C001, B001, S001 등)
  element_name TEXT,                -- 요소 이름 (캐릭터명, 배경명, 소품명 등)
  scene_number INT,                 -- 씬 번호 (씬 이미지인 경우)
  
  -- 생성 상태 관리 (백그라운드 폴링용)
  generation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  request_id TEXT,                  -- 외부 API 요청 ID (Replicate, FAL 등)
  
  -- 이미지 URL
  result_image_url TEXT,            -- AI 생성 결과 이미지 URL
  storage_image_url TEXT,           -- Supabase Storage URL (/gen-images/project_id/...)
  thumbnail_url TEXT,               -- 썸네일 URL
  
  -- 프롬프트 및 스타일
  prompt_used TEXT,                 -- 실제 사용된 프롬프트
  style_id UUID,                    -- 사용된 스타일 ID (styles 테이블 생성 후 외래키 추가 가능)
  style_name VARCHAR(100),          -- 스타일 이름
  custom_prompt TEXT,               -- 사용자 커스텀 프롬프트
  
  -- 버전 관리
  version INT DEFAULT 1,            -- 버전 번호
  is_selected BOOLEAN DEFAULT false, -- 최종 선택된 이미지 여부
  
  -- AI 모델 정보
  generation_model VARCHAR(100),    -- 'flux-pro', 'flux-kontext-pro', 'gpt-image-1' 등
  generation_params JSONB,          -- AI 모델 파라미터
  model_parameters JSONB,           -- 추가 모델 설정
  
  -- 참조 이미지 (Flux 등에서 사용)
  reference_image_url TEXT,         -- 참조 이미지 URL
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',      -- 추가 메타데이터
  tags TEXT[],                      -- AI 추천 태그
  
  -- 크레딧 정보
  credits_cost INT DEFAULT 0,       -- 사용된 크레딧
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_gen_images_project_id ON public.gen_images(project_id);
CREATE INDEX idx_gen_images_production_sheet_id ON public.gen_images(production_sheet_id);
CREATE INDEX idx_gen_images_image_type ON public.gen_images(image_type);
CREATE INDEX idx_gen_images_scene_number ON public.gen_images(scene_number);
CREATE INDEX idx_gen_images_is_selected ON public.gen_images(is_selected);
CREATE INDEX idx_gen_images_generation_status ON public.gen_images(generation_status);
CREATE INDEX idx_gen_images_request_id ON public.gen_images(request_id);
CREATE INDEX idx_gen_images_element_code ON public.gen_images(element_code);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.gen_images ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 프로젝트 소유자만 접근 가능
CREATE POLICY "Users can view their own images" ON public.gen_images
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own images" ON public.gen_images
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own images" ON public.gen_images
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

CREATE POLICY "Users can delete their own images" ON public.gen_images
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

-- 테이블 코멘트
COMMENT ON TABLE public.gen_images IS 'AI로 생성된 이미지 관리 (백그라운드 폴링 지원)';
COMMENT ON COLUMN public.gen_images.project_id IS '프로젝트 ID (외래키)';
COMMENT ON COLUMN public.gen_images.production_sheet_id IS '연출정리표 ID (외래키, NULL 가능)';
COMMENT ON COLUMN public.gen_images.image_type IS '이미지 타입: scene(씬), character(캐릭터), background(배경), prop(소품)';
COMMENT ON COLUMN public.gen_images.element_code IS '요소 코드 (C001, B001, S001 등)';
COMMENT ON COLUMN public.gen_images.element_name IS '요소 이름 (캐릭터명, 배경명 등)';
COMMENT ON COLUMN public.gen_images.scene_number IS '씬 번호 (씬 이미지인 경우)';
COMMENT ON COLUMN public.gen_images.generation_status IS '생성 상태: pending, processing, completed, failed';
COMMENT ON COLUMN public.gen_images.request_id IS '외부 API 요청 ID (Replicate, FAL 등)';
COMMENT ON COLUMN public.gen_images.result_image_url IS 'AI 생성 결과 이미지 URL';
COMMENT ON COLUMN public.gen_images.storage_image_url IS 'Supabase Storage URL';
COMMENT ON COLUMN public.gen_images.thumbnail_url IS '썸네일 URL';
COMMENT ON COLUMN public.gen_images.prompt_used IS '실제 사용된 프롬프트';
COMMENT ON COLUMN public.gen_images.style_id IS '사용된 스타일 ID (styles 테이블 참조)';
COMMENT ON COLUMN public.gen_images.style_name IS '스타일 이름';
COMMENT ON COLUMN public.gen_images.custom_prompt IS '사용자 커스텀 프롬프트';
COMMENT ON COLUMN public.gen_images.version IS '이미지 버전 번호';
COMMENT ON COLUMN public.gen_images.is_selected IS '최종 선택된 이미지 여부';
COMMENT ON COLUMN public.gen_images.generation_model IS '사용된 AI 모델 (flux-pro, gpt-image-1 등)';
COMMENT ON COLUMN public.gen_images.generation_params IS 'AI 모델 파라미터';
COMMENT ON COLUMN public.gen_images.model_parameters IS '추가 모델 설정';
COMMENT ON COLUMN public.gen_images.reference_image_url IS '참조 이미지 URL';
COMMENT ON COLUMN public.gen_images.metadata IS '추가 메타데이터 (JSON)';
COMMENT ON COLUMN public.gen_images.tags IS 'AI 추천 태그';
COMMENT ON COLUMN public.gen_images.credits_cost IS '사용된 크레딧';

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_gen_images_updated_at
  BEFORE UPDATE ON public.gen_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 뷰: 각 요소별 최신 선택된 이미지
CREATE OR REPLACE VIEW public.selected_gen_images AS
SELECT DISTINCT ON (project_id, image_type, COALESCE(element_name, scene_number::text))
  *
FROM public.gen_images
WHERE is_selected = true
ORDER BY project_id, image_type, COALESCE(element_name, scene_number::text), version DESC;

-- Storage 버킷 생성을 위한 정책 설명
-- Supabase Dashboard에서 'gen-images' 버킷 생성 필요
-- 경로 구조: /gen-images/{project_id}/{image_type}/{element_code}_{timestamp}.png
-- 공개 접근 가능하도록 설정