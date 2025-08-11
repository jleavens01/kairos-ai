-- Script Analysis Jobs Table
-- 비동기 스크립트 분석 작업 상태 추적용 테이블

CREATE TABLE IF NOT EXISTS public.script_analysis_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ai_processing, saving_to_db, completed, failed
  status_message TEXT,
  raw_script TEXT,
  result JSONB, -- 분석 결과 저장
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스
CREATE INDEX idx_script_analysis_jobs_job_id ON public.script_analysis_jobs(job_id);
CREATE INDEX idx_script_analysis_jobs_user_id ON public.script_analysis_jobs(user_id);
CREATE INDEX idx_script_analysis_jobs_project_id ON public.script_analysis_jobs(project_id);
CREATE INDEX idx_script_analysis_jobs_status ON public.script_analysis_jobs(status);
CREATE INDEX idx_script_analysis_jobs_created_at ON public.script_analysis_jobs(created_at DESC);

-- RLS 정책
ALTER TABLE public.script_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 작업만 볼 수 있음 (user_id가 null이면 모두 접근 가능)
CREATE POLICY "Users can view jobs" ON public.script_analysis_jobs
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- 모든 사용자가 작업을 생성할 수 있음 (인증 없이도 가능)
CREATE POLICY "Anyone can create jobs" ON public.script_analysis_jobs
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 작업을 업데이트할 수 있음 (임시)
CREATE POLICY "Anyone can update jobs" ON public.script_analysis_jobs
  FOR UPDATE USING (true);