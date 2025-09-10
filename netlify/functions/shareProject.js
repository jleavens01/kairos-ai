// 프로젝트 공유 API
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
    const { project_id, share_email, permission_level = 'editor' } = body;

    if (!project_id || !share_email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID and email are required.' })
      };
    }

    // Authorization 헤더에서 사용자 정보 추출
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header is missing.' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token.' })
      };
    }

    const ownerId = user.id;

    // 프로젝트 소유권 확인
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name, user_id')
      .eq('id', project_id)
      .eq('user_id', ownerId)
      .single();

    if (projectError || !projectData) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'You are not the owner of this project.' })
      };
    }

    // 공유할 사용자 찾기 (이메일로)
    const { data: { users: foundUsers }, error: findUserError } = await supabaseAdmin.auth.admin.listUsers();

    if (findUserError) {
      throw findUserError;
    }

    const sharedUser = foundUsers.find(u => u.email?.toLowerCase() === share_email.toLowerCase());

    if (!sharedUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `User with email ${share_email} not found.` })
      };
    }

    const sharedUserId = sharedUser.id;

    // 자기 자신에게 공유 방지
    if (ownerId === sharedUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'You cannot share a project with yourself.' })
      };
    }

    // project_shares 테이블에 공유 정보 삽입
    const { error: insertError } = await supabaseAdmin
      .from('project_shares')
      .insert({
        project_id: project_id,
        shared_by_user_id: ownerId,
        shared_with_user_id: sharedUserId,
        permission_level: permission_level
      });

    // 이미 공유된 경우 (중복 키 오류)
    if (insertError && insertError.code === '23505') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Project already shared with this user.' })
      };
    }

    if (insertError) {
      throw insertError;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `프로젝트를 ${share_email}에게 성공적으로 공유했습니다.` 
      })
    };

  } catch (error) {
    console.error('Share Project Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to share project',
        message: error.message 
      })
    };
  }
};