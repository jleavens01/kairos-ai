-- generated_images 테이블: AI로 생성된 이미지 관리
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.production_sheets(id) ON DELETE SET NULL,
  
  -- 생성 정보
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model VARCHAR(100) NOT NULL, -- gpt-image_1_byok, flux-pro, flux-kontext 등
  
  -- 이미지 정보
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INT,
  width INT,
  height INT,
  
  -- 생성 파라미터
  parameters JSONB, -- 모델별 파라미터 (seed, guidance_scale, steps 등)
  
  -- 메타데이터
  category VARCHAR(50), -- character, background, object, scene 등
  character_name VARCHAR(100), -- 캐릭터 이미지인 경우 캐릭터 이름
  tags TEXT[], -- 태그 배열
  is_favorite BOOLEAN DEFAULT false,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_generated_images_project ON generated_images(project_id);
CREATE INDEX idx_generated_images_scene ON generated_images(scene_id);
CREATE INDEX idx_generated_images_category ON generated_images(category);
CREATE INDEX idx_generated_images_character ON generated_images(character_name);
CREATE INDEX idx_generated_images_created_at ON generated_images(created_at DESC);

-- RLS 정책
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로젝트의 이미지만 볼 수 있음
CREATE POLICY "Users can view own project images" ON generated_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generated_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 사용자는 자신의 프로젝트에 이미지를 생성할 수 있음
CREATE POLICY "Users can create images for own projects" ON generated_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generated_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 사용자는 자신의 프로젝트의 이미지를 수정할 수 있음
CREATE POLICY "Users can update own project images" ON generated_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generated_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- 사용자는 자신의 프로젝트의 이미지를 삭제할 수 있음
CREATE POLICY "Users can delete own project images" ON generated_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = generated_images.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Supabase Storage 버킷 생성 (이미 존재하지 않는 경우)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('gen-images', 'gen-images', true)
-- ON CONFLICT (id) DO NOTHING;