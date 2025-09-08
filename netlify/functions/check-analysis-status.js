// 스크립트 분석 상태 확인 함수
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // URL 파라미터에서 jobId 추출
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'jobId parameter is required'
        })
      };
    }

    // 사용자 인증 확인 (옵션 - 인증 없이도 작동하지만 RLS 적용)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (!userError && user) {
          userId = user.id;
          // RLS를 위해 세션 설정
          await supabase.auth.setSession({ access_token: token, refresh_token: null });
          console.log(`User authenticated: ${user.id}, checking job ${jobId}`);
        } else {
          console.log('User auth failed:', userError);
        }
      } catch (authError) {
        console.log('Auth check failed, continuing without user ID:', authError.message);
      }
    } else {
      console.log('No authorization header provided');
    }

    console.log(`Checking status for analysis job ${jobId}`);

    // Service Role 클라이언트로 조회 (RLS 우회하되 user_id 검증)
    const serviceSupabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // 분석 작업 상태 조회
    const { data: job, error: jobError } = await serviceSupabase
      .from('script_analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    // 사용자 인증이 있는 경우 user_id 검증
    if (job && userId && job.user_id !== userId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Analysis job not found'
        })
      };
    }

    if (jobError) {
      if (jobError.code === 'PGRST116') { // Not found
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Analysis job not found'
          })
        };
      }
      throw jobError;
    }

    if (!job) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Analysis job not found'
        })
      };
    }

    // 만료된 작업인지 확인
    if (new Date(job.expires_at) < new Date()) {
      return {
        statusCode: 410, // Gone
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Analysis job has expired'
        })
      };
    }

    // 응답 데이터 구성
    const response = {
      success: true,
      jobId: job.id,
      status: job.job_status,
      progress: job.progress_percentage || 0,
      currentStep: job.current_step,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      estimatedCompletionTime: job.estimated_completion_time,
      totalScenes: job.total_scenes,
      scriptLength: job.script_length
    };

    // 상태별 추가 정보
    switch (job.job_status) {
      case 'pending':
        response.message = '분석 작업이 대기 중입니다.';
        break;
        
      case 'processing':
        response.message = `분석 진행 중... (${job.progress_percentage || 0}%)`;
        if (job.estimated_completion_time) {
          const remainingTime = new Date(job.estimated_completion_time) - new Date();
          response.estimatedRemainingTime = Math.max(0, remainingTime);
        }
        break;
        
      case 'completed':
        response.message = `분석 완료! ${job.total_scenes}개 씬이 생성되었습니다.`;
        response.result = job.result_data;
        break;
        
      case 'needs_cleanup':
        response.message = `부분 완료! ${job.total_scenes}개 씬이 생성되었습니다. 정리 작업이 필요합니다.`;
        response.result = job.result_data;
        response.needsCleanup = true;
        response.parsingStatus = job.parsing_status;
        response.rawResponseLength = job.raw_ai_response ? job.raw_ai_response.length : 0;
        break;
        
      case 'failed':
        response.message = '분석 작업이 실패했습니다.';
        response.error = job.error_message;
        break;
        
      default:
        response.message = '알 수 없는 상태입니다.';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error in check-analysis-status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};