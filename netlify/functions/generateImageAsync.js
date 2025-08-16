// AI 이미지 생성 라우터 (모델별 함수로 라우팅)
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { generateImage as generateGPTImage } from './generateGPTImage.js';
import { generateImage as generateFluxImage } from './generateFluxImage.js';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  let user;
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // 사용자 인증
    const authHeader = event.headers.authorization;
    if (!authHeader) throw { statusCode: 401, message: 'Authorization header is missing.' };
    
    const token = authHeader.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Token is missing.' };
    
    // JWT 검증
    try {
      user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      if (!user || !user.sub) throw { statusCode: 401, message: 'Invalid token payload.' };
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      throw { statusCode: 401, message: 'Invalid token.' };
    }

    // 요청 데이터 파싱
    const requestData = JSON.parse(event.body || '{}');
    const { model = 'gpt-image-1' } = requestData;

    console.log('Image generation request - Model:', model);

    // 모델별 함수로 라우팅
    let result;
    
    try {
      switch(model) {
        case 'gpt-image-1':
          result = await generateGPTImage({
            ...requestData,
            user,
            supabaseAdmin
          });
          break;
          
        case 'flux-pro':
        case 'flux-schnell':
        case 'flux-kontext':
        case 'flux-kontext-multi':
          result = await generateFluxImage({
            ...requestData,
            user,
            supabaseAdmin
          });
          break;
          
        case 'stable-diffusion':
        case 'midjourney':
          // 아직 구현되지 않은 모델
          return {
            statusCode: 501,
            headers,
            body: JSON.stringify({
              error: `Model ${model} is not yet implemented`,
              message: 'This model will be available soon'
            })
          };
          
        default:
          throw new Error(`Unsupported image generation model: ${model}`);
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      };

    } catch (error) {
      console.error(`Image generation error for model ${model}:`, error);
      throw error;
    }

  } catch (error) {
    console.error('Image generation router error:', error);
    
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: message })
    };
  }
};