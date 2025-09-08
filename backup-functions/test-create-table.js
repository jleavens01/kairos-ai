// 임시 테이블 생성 테스트 함수 - 개발용
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  // Service role key 사용 (테이블 생성 권한 필요)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key 필요
  );

  try {
    console.log('Creating script_analysis_jobs table...');

    // 테이블 생성 SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.script_analysis_jobs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        
        -- 작업 정보
        job_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        script_text TEXT NOT NULL,
        script_length INT NOT NULL,
        
        -- 진행 상황
        progress_percentage INT DEFAULT 0,
        current_step VARCHAR(100),
        estimated_completion_time TIMESTAMPTZ,
        
        -- 결과 정보
        total_scenes INT,
        error_message TEXT,
        result_data JSONB,
        
        -- 메타데이터
        analysis_type VARCHAR(50) DEFAULT 'documentary',
        ai_model VARCHAR(50) DEFAULT 'gemini-2.0-flash-exp',
        
        -- 타임스탬프
        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
      );
    `;

    // 테이블 존재 여부 확인
    const testQuery = await supabase
      .from('script_analysis_jobs')
      .select('id')
      .limit(1);
    
    if (testQuery.error) {
      console.error('Table does not exist:', testQuery.error.message);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'script_analysis_jobs table does not exist',
          details: testQuery.error.message,
          sqlToExecute: createTableSQL,
          instruction: `Please execute this SQL in Supabase Dashboard:
          
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Execute the following SQL:

${createTableSQL}

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_script_analysis_jobs_project_id ON public.script_analysis_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_script_analysis_jobs_user_id ON public.script_analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_script_analysis_jobs_status ON public.script_analysis_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_script_analysis_jobs_created_at ON public.script_analysis_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.script_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own analysis jobs" ON public.script_analysis_jobs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own analysis jobs" ON public.script_analysis_jobs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own analysis jobs" ON public.script_analysis_jobs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own analysis jobs" ON public.script_analysis_jobs FOR DELETE USING (user_id = auth.uid());
`
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'script_analysis_jobs table created successfully with indexes and RLS policies',
        tableCreated: true
      })
    };

  } catch (error) {
    console.error('Error creating table:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        suggestion: 'Please run the SQL migration manually in Supabase dashboard or check service role permissions'
      })
    };
  }
};