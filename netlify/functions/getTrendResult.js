// 트렌드 수집 결과 확인 함수

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { projectId, jobId } = event.queryStringParameters || {};
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'projectId가 필요합니다.'
        })
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 프로젝트에서 트렌드 분석 결과 가져오기
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('metadata')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      throw projectError;
    }
    
    const trendData = project?.metadata?.lastTrendAnalysis;
    const lastJobId = project?.metadata?.lastTrendJobId;
    const lastUpdate = project?.metadata?.lastTrendUpdate;
    
    if (!trendData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'no_data',
          message: '아직 트렌드 분석 결과가 없습니다.'
        })
      };
    }
    
    // jobId가 제공되었고 일치하지 않으면 처리 중
    if (jobId && jobId !== lastJobId) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'processing',
          message: '트렌드 분석이 진행 중입니다. 잠시 후 다시 확인해주세요.',
          jobId
        })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: 'completed',
        data: trendData,
        jobId: lastJobId,
        updatedAt: lastUpdate
      })
    };
    
  } catch (error) {
    console.error('트렌드 결과 조회 실패:', error);
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