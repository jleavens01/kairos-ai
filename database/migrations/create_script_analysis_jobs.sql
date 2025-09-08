-- 스크립트 분석 작업 상태 추적 테이블
-- 비동기 AI 분석 작업 관리

CREATE TABLE IF NOT EXISTS public.script_analysis_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 작업 정보
  job_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  script_text TEXT NOT NULL,
  script_length INT NOT NULL,
  
  -- 진행 상황
  progress_percentage INT DEFAULT 0,
  current_step VARCHAR(100),
  estimated_completion_time TIMESTAMPTZ,
  
  -- 결과 정보
  total_scenes INT,
  error_message TEXT,
  result_data JSONB, -- AI 분석 결과 저장
  
  -- 메타데이터
  analysis_type VARCHAR(50) DEFAULT 'documentary', -- 'documentary', 'general', 'detailed'
  ai_model VARCHAR(50) DEFAULT 'gemini-2.5-pro',
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- 인덱스 생성
CREATE INDEX idx_script_analysis_jobs_project_id ON public.script_analysis_jobs(project_id);
CREATE INDEX idx_script_analysis_jobs_user_id ON public.script_analysis_jobs(user_id);
CREATE INDEX idx_script_analysis_jobs_status ON public.script_analysis_jobs(job_status);
CREATE INDEX idx_script_analysis_jobs_created_at ON public.script_analysis_jobs(created_at DESC);

-- RLS 활성화
ALTER TABLE public.script_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 분석 작업만 접근 가능
CREATE POLICY "Users can view their own analysis jobs" ON public.script_analysis_jobs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own analysis jobs" ON public.script_analysis_jobs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own analysis jobs" ON public.script_analysis_jobs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own analysis jobs" ON public.script_analysis_jobs
  FOR DELETE
  USING (user_id = auth.uid());

-- 자동 만료 작업 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_analysis_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.script_analysis_jobs 
  WHERE expires_at < NOW() 
  AND job_status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 테이블 코멘트
COMMENT ON TABLE public.script_analysis_jobs IS '스크립트 분석 작업 상태 추적 테이블 (비동기 처리)';
COMMENT ON COLUMN public.script_analysis_jobs.job_status IS '작업 상태: pending, processing, completed, failed';
COMMENT ON COLUMN public.script_analysis_jobs.progress_percentage IS '진행률 (0-100)';
COMMENT ON COLUMN public.script_analysis_jobs.result_data IS 'AI 분석 결과 JSON 데이터';
COMMENT ON COLUMN public.script_analysis_jobs.expires_at IS '작업 결과 만료 시간 (24시간 후 자동 삭제)';