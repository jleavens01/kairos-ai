// /netlify/functions/deleteProductionSheetRows.js

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export const handler = async (event) => {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', 
    'Access-Control-Allow-Methods': 'POST, OPTIONS' 
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // 사용자 인증
    const authHeader = event.headers.authorization;
    if (!authHeader) throw { statusCode: 401, message: 'Authorization header is missing.' };
    const token = authHeader.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Token is missing.' };
    
    const user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    if (!user || !user.sub) throw { statusCode: 401, message: 'Invalid token payload.' };

    // 요청 본문 파싱
    const { projectId, idsToDelete } = JSON.parse(event.body);
    if (!projectId || !idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
      throw new Error("projectId and a non-empty array of idsToDelete are required.");
    }

    // Supabase Admin 클라이언트 생성 (Service Role Key 사용)
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 1. 먼저 삭제할 씬들 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('production_sheets')
      .delete()
      .in('id', idsToDelete);
    
    if (deleteError) throw deleteError;
    
    // 2. 남은 씬들 조회
    const { data: remainingScenes, error: fetchError } = await supabaseAdmin
      .from('production_sheets')
      .select('id, scene_number')
      .eq('project_id', projectId)
      .order('scene_number', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    // 3. 씬 번호 재정렬
    if (remainingScenes && remainingScenes.length > 0) {
      // 씬 번호를 1부터 순서대로 재할당
      const updates = remainingScenes.map((scene, index) => ({
        id: scene.id,
        scene_number: index + 1
      }));
      
      // 임시 씬 번호로 먼저 업데이트 (중복 방지)
      for (const update of updates) {
        const tempNumber = 10000 + update.scene_number; // 임시로 큰 숫자 사용
        const { error: tempError } = await supabaseAdmin
          .from('production_sheets')
          .update({ scene_number: tempNumber })
          .eq('id', update.id);
        
        if (tempError) throw tempError;
      }
      
      // 실제 씬 번호로 다시 업데이트
      for (const update of updates) {
        const { error: updateError } = await supabaseAdmin
          .from('production_sheets')
          .update({ scene_number: update.scene_number })
          .eq('id', update.id);
        
        if (updateError) throw updateError;
      }
    }

    // 성공 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Rows deleted and renumbered successfully.' }),
    };

  } catch (error) {
    console.error('Error in deleteProductionSheetRows handler:', error);
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error.';
    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};