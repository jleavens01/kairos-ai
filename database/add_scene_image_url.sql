-- production_sheets 테이블에 scene_image_url 컬럼 추가
ALTER TABLE public.production_sheets
ADD COLUMN IF NOT EXISTS scene_image_url TEXT;

-- scene_image_url 컬럼에 대한 설명 추가
COMMENT ON COLUMN public.production_sheets.scene_image_url IS '씬에 연결된 AI 생성 이미지 URL';