// /netlify/functions/addProductionSheetRow.js

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
    const { projectId, afterSceneNumber } = JSON.parse(event.body);
    if (projectId === undefined || afterSceneNumber === undefined) {
      throw new Error("projectId and afterSceneNumber are required.");
    }

    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // DB 함수(RPC) 호출
    console.log('Calling RPC with:', { projectId, afterSceneNumber });
    
    const { data, error: rpcError } = await supabaseAdmin.rpc('add_production_sheet_row', {
      p_project_id: projectId,
      p_after_scene_number: afterSceneNumber
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw rpcError;
    }
    
    console.log('RPC Success:', data);

    // 성공 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Row added and scenes renumbered successfully.' }),
    };

  } catch (error) {
    console.error('Error in addProductionSheetRow handler:', error);
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error.';
    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};