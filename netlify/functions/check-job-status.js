// /netlify/functions/check-job-status.js
// 비동기 작업의 상태를 확인하는 함수

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

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // URL 파라미터에서 job_id 추출
    const jobId = event.queryStringParameters?.job_id;

    if (!jobId) {
      throw new Error('작업 ID가 필요합니다.');
    }

    // 작업 상태 조회
    const { data: job, error } = await supabase
      .from('script_analysis_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !job) {
      throw new Error('작업을 찾을 수 없습니다.');
    }

    // 진행률 계산 (상태에 따른 진행률)
    let progress = 0;
    switch (job.status) {
      case 'processing':
        progress = 10;
        break;
      case 'ai_processing':
        progress = 50;
        break;
      case 'saving_to_db':
        progress = 90;
        break;
      case 'completed':
        progress = 100;
        break;
      case 'failed':
        progress = 0;
        break;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          job_id: job.job_id,
          status: job.status,
          progress,
          status_message: job.status_message,
          result: job.result,
          error_message: job.error_message,
          created_at: job.created_at,
          completed_at: job.completed_at
        }
      })
    };

  } catch (error) {
    console.error('Job status check error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '작업 상태 확인 실패'
      })
    };
  }
};