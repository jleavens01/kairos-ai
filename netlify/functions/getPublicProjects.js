// 공개 프로젝트 조회 API (단순화 버전)
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // 요청 데이터 파싱
    const body = JSON.parse(event.body || '{}');
    const { 
      page = 1, 
      limit = 12, 
      category = '', 
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = body;

    // 페이지네이션 계산
    const offset = (page - 1) * limit;

    // 기본 쿼리 작성 (최소한의 컬럼만)
    let query = supabaseAdmin
      .from('projects')
      .select('id, name, description, thumbnail_url, tags, created_at, updated_at')
      .is('deleted_at', null);

    // 검색 필터 적용
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 카테고리 필터 적용
    if (category) {
      query = query.contains('tags', [category]);
    }

    // 정렬 적용
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1);

    // 쿼리 실행
    const { data: projects, error: projectsError } = await query;
    
    if (projectsError) {
      throw projectsError;
    }

    // 전체 개수 조회
    const { count: totalCount } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact' })
      .is('deleted_at', null);

    // 프로젝트 데이터 변환 (단순화)
    const transformedProjects = (projects || []).map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      thumbnail_url: project.thumbnail_url,
      tags: project.tags || [],
      created_at: project.created_at,
      updated_at: project.updated_at,
      view_count: 0,
      like_count: 0,
      creator_name: '익명',
      creator_avatar: null
    }));

    // 응답 데이터 구성
    const responseData = {
      projects: transformedProjects,
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: (offset + transformedProjects.length) < (totalCount || 0)
      },
      stats: {
        totalProjects: totalCount || 0,
        totalCreators: 0,
        totalViews: 0
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Error fetching public projects:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch public projects',
        message: error.message 
      })
    };
  }
};