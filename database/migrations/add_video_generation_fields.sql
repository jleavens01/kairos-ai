-- Migration: Add missing fields for video generation models
-- Date: 2025-01-10

-- Add camera_movement field for SeedDance and other models
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS camera_movement VARCHAR(50);
COMMENT ON COLUMN public.gen_videos.camera_movement IS '카메라 움직임 (fixed, dynamic, pan, zoom 등)';

-- Add model_version field for model versioning
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS model_version VARCHAR(100);
COMMENT ON COLUMN public.gen_videos.model_version IS 'AI 모델 버전 (veo-2, kling-2.1, seedance-v1-pro 등)';

-- Add api_request field to store original API request
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS api_request JSONB;
COMMENT ON COLUMN public.gen_videos.api_request IS '원본 API 요청 데이터';

-- Add credits_used field for credit tracking
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS credits_used INTEGER;
COMMENT ON COLUMN public.gen_videos.credits_used IS '사용된 크레딧 수';

-- Add linked_scene_id field for storyboard connection
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS linked_scene_id UUID;
COMMENT ON COLUMN public.gen_videos.linked_scene_id IS '연결된 스토리보드 씬 ID';

-- Add negative_prompt field for models that support it
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS negative_prompt TEXT;
COMMENT ON COLUMN public.gen_videos.negative_prompt IS '네거티브 프롬프트 (원하지 않는 요소)';

-- Add aspect_ratio field
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(20);
COMMENT ON COLUMN public.gen_videos.aspect_ratio IS '화면 비율 (16:9, 9:16, 1:1 등)';

-- Add person_generation field for Veo models
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS person_generation VARCHAR(50);
COMMENT ON COLUMN public.gen_videos.person_generation IS '인물 생성 설정 (allow_adult, dont_generate 등)';

-- Add prompt_optimizer field for Hailou models
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS prompt_optimizer BOOLEAN;
COMMENT ON COLUMN public.gen_videos.prompt_optimizer IS '프롬프트 최적화 사용 여부';

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_gen_videos_camera_movement ON public.gen_videos(camera_movement);
CREATE INDEX IF NOT EXISTS idx_gen_videos_model_version ON public.gen_videos(model_version);
CREATE INDEX IF NOT EXISTS idx_gen_videos_credits_used ON public.gen_videos(credits_used);
CREATE INDEX IF NOT EXISTS idx_gen_videos_linked_scene_id ON public.gen_videos(linked_scene_id);

-- Update existing records to have default values
UPDATE public.gen_videos 
SET model_version = generation_model 
WHERE model_version IS NULL AND generation_model IS NOT NULL;

UPDATE public.gen_videos 
SET camera_movement = 'dynamic' 
WHERE camera_movement IS NULL;