-- styles 테이블 생성
CREATE TABLE IF NOT EXISTS public.styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  style_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(100),
  base_image_url TEXT,
  image_ratio VARCHAR(20),
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID,
  storage_image_path TEXT,
  migrated_at TIMESTAMPTZ,
  scene_style_description TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_styles_style_code ON public.styles(style_code);
CREATE INDEX IF NOT EXISTS idx_styles_type ON public.styles(type);
CREATE INDEX IF NOT EXISTS idx_styles_project_id ON public.styles(project_id);
CREATE INDEX IF NOT EXISTS idx_styles_user_id ON public.styles(user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 스타일을 읽을 수 있음
CREATE POLICY "Anyone can view styles" ON public.styles
  FOR SELECT USING (true);

-- RLS 정책: 인증된 사용자만 스타일 생성 가능 (관리자 기능을 위해)
CREATE POLICY "Authenticated users can create styles" ON public.styles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS 정책: 스타일을 생성한 사용자만 수정 가능
CREATE POLICY "Users can update own styles" ON public.styles
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

-- RLS 정책: 스타일을 생성한 사용자만 삭제 가능
CREATE POLICY "Users can delete own styles" ON public.styles
  FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- 테이블 코멘트
COMMENT ON TABLE public.styles IS '이미지 생성 스타일 템플릿';
COMMENT ON COLUMN public.styles.id IS '스타일 고유 ID';
COMMENT ON COLUMN public.styles.project_id IS '프로젝트 ID (프로젝트별 스타일일 경우)';
COMMENT ON COLUMN public.styles.style_code IS '스타일 코드 (style001, style002 등)';
COMMENT ON COLUMN public.styles.name IS '스타일 이름';
COMMENT ON COLUMN public.styles.description IS '스타일 상세 설명 (영문 프롬프트)';
COMMENT ON COLUMN public.styles.type IS '스타일 타입 (ELEMENT_ART_STYLE 등)';
COMMENT ON COLUMN public.styles.base_image_url IS '스타일 예시 이미지 URL';
COMMENT ON COLUMN public.styles.image_ratio IS '이미지 비율';
COMMENT ON COLUMN public.styles.config IS '스타일 설정 (JSON)';
COMMENT ON COLUMN public.styles.created_at IS '생성일시';
COMMENT ON COLUMN public.styles.updated_at IS '수정일시';
COMMENT ON COLUMN public.styles.user_id IS '생성 사용자 ID';
COMMENT ON COLUMN public.styles.storage_image_path IS '스토리지 이미지 경로';
COMMENT ON COLUMN public.styles.migrated_at IS '마이그레이션 일시';
COMMENT ON COLUMN public.styles.scene_style_description IS '씬 스타일 설명';

-- 기존 gen_images 테이블에 외래키 추가 (이미 style_id 컬럼이 있는 경우)
-- ALTER TABLE public.gen_images 
-- ADD CONSTRAINT fk_gen_images_style 
-- FOREIGN KEY (style_id) REFERENCES public.styles(id);