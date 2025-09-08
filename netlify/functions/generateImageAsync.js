// AI 이미지 생성 라우터 (모델별 함수로 라우팅)
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { generateImage as generateGPTImage } from './generateGPTImage.js';
import { generateImage as generateFluxImage } from './generateFluxImage.js';
import { generateImage as generateGeminiEditImage } from './generateGeminiEditImage.js';
import { generateImage as generateRecraftImage } from './generateRecraftImage.js';

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
          
        case 'gemini-25-flash-edit':
          result = await generateGeminiEditImage({
            ...requestData,
            user,
            supabaseAdmin
          });
          break;
          
        case 'recraft-v3':
        case 'recraft-realistic':
          result = await generateRecraftImage({
            ...requestData,
            user,
            supabaseAdmin
          });
          break;
          
        case 'recraft-i2i':
          // Recraft I2I는 첫 번째 참조 이미지를 변환
          if (!requestData.referenceImages || requestData.referenceImages.length === 0) {
            throw new Error('Recraft I2I requires at least one reference image');
          }
          
          const i2iResponse = await fetch('/.netlify/functions/generateRecraftI2I', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': event.headers.authorization
            },
            body: JSON.stringify({
              image_url: requestData.referenceImages[0],
              prompt: requestData.prompt,
              strength: requestData.parameters?.strength || '0.5',
              style: requestData.parameters?.style || 'digital_illustration',
              original_image_id: requestData.originalImageId // 원본 이미지 ID가 있으면 전달
            })
          });
          
          const i2iResult = await i2iResponse.json();
          
          if (!i2iResponse.ok) {
            throw new Error(i2iResult.error || 'Recraft I2I transformation failed');
          }
          
          // gen_images 테이블에 저장
          const { data: insertData, error: insertError } = await supabaseAdmin
            .from('gen_images')
            .insert({
              project_id: requestData.projectId,
              image_type: requestData.category || 'scene',
              element_name: requestData.characterName || 'I2I Transformed Image',
              generation_status: 'completed',
              result_image_url: i2iResult.transformed_url,
              thumbnail_url: i2iResult.transformed_url,
              prompt_used: requestData.prompt,
              style_name: i2iResult.style,
              generation_model: 'recraft-i2i',
              generation_params: {
                strength: i2iResult.strength,
                style: i2iResult.style,
                original_url: i2iResult.original_url
              },
              reference_image_url: requestData.referenceImages[0],
              credits_cost: i2iResult.credit_cost || 80,
              metadata: i2iResult.raw_response,
              created_at: new Date().toISOString()
            })
            .select('*');
          
          if (insertError) {
            console.error('Database insert error:', insertError);
            throw new Error('Failed to save I2I result to database');
          }
          
          result = {
            success: true,
            image_url: i2iResult.transformed_url,
            image_id: insertData[0]?.id,
            id: insertData[0]?.id,
            image_type: requestData.category || 'scene',
            category: requestData.category || 'scene',
            status: 'completed',
            model: 'recraft-i2i',
            credit_cost: i2iResult.credit_cost || 80
          };
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