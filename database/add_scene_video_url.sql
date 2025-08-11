-- production_sheets 테이블에 scene_video_url 컬럼 추가
-- 씬에 비디오를 링크할 수 있도록 지원

ALTER TABLE public.production_sheets
ADD COLUMN IF NOT EXISTS scene_video_url TEXT;

-- scene_video_url 컬럼에 대한 설명 추가
COMMENT ON COLUMN public.production_sheets.scene_video_url IS '씬에 연결된 AI 생성 비디오 URL';

-- scene_media_type 컬럼 추가 (이미지/비디오 전환을 위해)
ALTER TABLE public.production_sheets
ADD COLUMN IF NOT EXISTS scene_media_type VARCHAR(20) DEFAULT 'image';

-- scene_media_type 컬럼에 대한 설명 추가
COMMENT ON COLUMN public.production_sheets.scene_media_type IS '씬 미디어 타입: image(이미지) 또는 video(비디오)';

-- scene_media_type에 대한 체크 제약 조건 추가
ALTER TABLE public.production_sheets
ADD CONSTRAINT check_scene_media_type 
CHECK (scene_media_type IN ('image', 'video'));

-- gen_videos 테이블에 scene_link 관련 컬럼 추가
ALTER TABLE public.gen_videos
ADD COLUMN IF NOT EXISTS linked_scene_id UUID REFERENCES public.production_sheets(id) ON DELETE SET NULL;

ALTER TABLE public.gen_videos
ADD COLUMN IF NOT EXISTS linked_scene_number INT;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.gen_videos.linked_scene_id IS '연결된 씬 ID (production_sheets 테이블 참조)';
COMMENT ON COLUMN public.gen_videos.linked_scene_number IS '연결된 씬 번호';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_gen_videos_linked_scene_id ON public.gen_videos(linked_scene_id);
CREATE INDEX IF NOT EXISTS idx_production_sheets_scene_media_type ON public.production_sheets(scene_media_type);