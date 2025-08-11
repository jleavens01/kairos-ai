-- projects 테이블 생성
CREATE TABLE IF NOT EXISTS public.projects (
  -- 기본 정보
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- 프로젝트 상태
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  is_public BOOLEAN DEFAULT false,
  
  -- 미디어
  thumbnail_url TEXT,
  
  -- 프로젝트 내용
  content TEXT, -- 스크립트, 텍스트, 기타 내용
  
  -- 태그와 분류
  tags TEXT[] DEFAULT '{}',
  
  -- 협업
  collaborators UUID[] DEFAULT '{}',
  share_token VARCHAR(255) UNIQUE,
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- 메타데이터 (확장 가능한 추가 정보)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  deleted_at TIMESTAMPTZ -- 소프트 삭제용
);

-- 인덱스 생성
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX idx_projects_deleted_at ON public.projects(deleted_at);
CREATE INDEX idx_projects_share_token ON public.projects(share_token);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS 정책들

-- 1. 사용자는 자신의 프로젝트를 볼 수 있음
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR auth.uid() = ANY(collaborators)
    OR (is_public = true AND deleted_at IS NULL)
  );

-- 2. 사용자는 자신의 프로젝트를 생성할 수 있음
CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. 사용자는 자신의 프로젝트를 수정할 수 있음
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = ANY(collaborators))
  WITH CHECK (auth.uid() = user_id OR auth.uid() = ANY(collaborators));

-- 4. 사용자는 자신의 프로젝트를 삭제할 수 있음 (소유자만)
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE 
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON public.projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 (선택사항 - 테스트용)
-- INSERT INTO public.projects (user_id, name, description, status)
-- VALUES 
--   (auth.uid(), '첫 번째 프로젝트', 'AI로 만든 첫 콘텐츠 프로젝트입니다.', 'draft'),
--   (auth.uid(), '두 번째 프로젝트', '진행 중인 프로젝트', 'in_progress');