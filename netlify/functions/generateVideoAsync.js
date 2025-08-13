// AI 비디오 생성 라우터 함수
// 각 모델별로 전용 함수로 요청을 라우팅합니다
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
    const {
      projectId,
      prompt,
      model = 'veo2',
      category = 'scene',
      parameters = {},
      referenceImageUrl = null,
      styleId = null
    } = JSON.parse(event.body || '{}');

    if (!projectId || !prompt) {
      throw new Error('projectId and prompt are required.');
    }

    console.log('Video generation async request:', {
      projectId,
      model,
      category,
      hasReferenceImage: !!referenceImageUrl
    });

    // 모델명 정규화
    let normalizedModel = model;
    switch (model.toLowerCase()) {
      case 'seedance':
      case 'seedance-pro':
        normalizedModel = 'seedance-v1-pro';
        break;
      case 'seedance-lite':
        normalizedModel = 'seedance-v1-lite';
        break;
      // 다른 모델들은 그대로 사용
    }

    // 1. 먼저 DB에 pending 상태로 기록 생성
    // 모델별 파라미터 추출
    let dbInsertData = {
      project_id: projectId,
      video_type: category,
      element_name: prompt.substring(0, 100),
      generation_status: 'pending',
      generation_model: normalizedModel,
      model_parameters: parameters,
      prompt_used: prompt,
      custom_prompt: prompt,
      reference_image_url: referenceImageUrl,
      style_id: styleId,
      created_by: user.sub,
      api_request: {
        model,
        parameters,
        referenceImageUrl,
        prompt
      }
    };

    // 모델별 특정 파라미터 저장
    if (model.includes('veo')) {
      // Google Veo 모델
      dbInsertData.negative_prompt = parameters.negativePrompt || '';
      dbInsertData.aspect_ratio = parameters.aspectRatio || '16:9';
      dbInsertData.person_generation = parameters.personGeneration || 'allow_adult';
      dbInsertData.model_version = model;
    } else if (model.includes('kling')) {
      // Kling 모델
      dbInsertData.duration_seconds = parameters.duration || 5;
      dbInsertData.negative_prompt = parameters.negative_prompt || 'blur, distort, and low quality';
      dbInsertData.model_version = 'kling-2.1';
    } else if (model.includes('hailou')) {
      // Hailou 모델
      dbInsertData.prompt_optimizer = parameters.prompt_optimizer !== undefined ? parameters.prompt_optimizer : true;
      if (model.includes('standard')) {
        dbInsertData.duration_seconds = parameters.duration || 6;
        dbInsertData.resolution = parameters.resolution || '768P';
        dbInsertData.model_version = 'hailou-02-standard';
      } else {
        dbInsertData.duration_seconds = 5; // Pro는 5초 고정
        dbInsertData.model_version = 'hailou-02-pro';
      }
    }

    const { data: videoRecord, error: dbError } = await supabaseAdmin
      .from('gen_videos')
      .insert(dbInsertData)
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw new Error('Failed to create video record.');
    }

    // 2. 모델에 따라 적절한 함수로 라우팅
    let modelFunction;
    let modelName;
    
    switch (model.toLowerCase()) {
      case 'veo2':
      case 'veo-2':
      case 'google-veo2':
        modelFunction = 'generateVeo2Video';
        modelName = 'Google Veo 2';
        break;
        
      case 'veo3':
      case 'veo-3':
      case 'veo3-preview':
      case 'google-veo3':
        modelFunction = 'generateVeo3PreviewVideo';
        modelName = 'Google Veo 3 Preview';
        break;
        
      case 'veo3-fast':
      case 'veo-3-fast':
      case 'veo3-fast-preview':
      case 'google-veo3-fast':
        modelFunction = 'generateVeo3FastVideo';
        modelName = 'Google Veo 3 Fast Preview';
        break;
        
      case 'kling':
      case 'kling2.1':
      case 'kling-2.1':
      case 'kling21':
        modelFunction = 'generateKling21Video';
        modelName = 'Kling 2.1 Pro';
        break;
        
      case 'hailou':
      case 'hailou02':
      case 'hailou-02':
      case 'minimax':
      case 'hailou02-standard':
        modelFunction = 'generateHailouVideo';
        modelName = 'MiniMax Hailou 02 Standard';
        break;
        
      case 'hailou02-pro':
      case 'hailou-pro':
        modelFunction = 'generateHailouVideo';
        modelName = 'MiniMax Hailou 02 Pro';
        break;
        
      case 'seedance':
      case 'seed-dance':
      case 'bytedance':
      case 'seedance-pro':
        modelFunction = 'generateSeedanceVideo';
        modelName = 'ByteDance SeedDance v1 Pro';
        break;
        
      case 'seedance-lite':
      case 'seed-dance-lite':
      case 'bytedance-lite':
        modelFunction = 'generateSeedanceLiteVideo';
        modelName = 'ByteDance SeedDance v1 Lite';
        break;
        
      // 향후 추가 모델들을 위한 케이스
      case 'runway':
      case 'runway-gen3':
        modelFunction = 'generateRunwayVideo';
        modelName = 'Runway Gen-3';
        break;
        
      case 'pika':
      case 'pika-labs':
        modelFunction = 'generatePikaVideo';
        modelName = 'Pika Labs';
        break;
        
      case 'stable-video':
      case 'stable-diffusion-video':
        modelFunction = 'generateStableVideo';
        modelName = 'Stable Video Diffusion';
        break;
        
      default:
        // 지원하지 않는 모델
        await supabaseAdmin
          .from('gen_videos')
          .update({
            generation_status: 'failed',
            metadata: {
              error: `Unsupported model: ${model}`
            }
          })
          .eq('id', videoRecord.id);
          
        throw new Error(`지원하지 않는 모델입니다: ${model}`);
    }

    console.log(`Routing to ${modelFunction} for ${modelName}`);

    // 3. 선택된 모델 함수 호출
    try {
      // Netlify Functions 간 호출을 위한 전체 URL 구성
      const baseUrl = process.env.URL || `https://${event.headers.host}` || 'http://localhost:8888';
      const functionUrl = `${baseUrl}/.netlify/functions/${modelFunction}`;
      
      console.log(`Calling model function at: ${functionUrl}`);
      
      const modelResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': event.headers.authorization
        },
        body: JSON.stringify({
          projectId,
          videoId: videoRecord.id,
          imageUrl: referenceImageUrl,
          prompt: prompt,
          model: model,  // 모델명 전달 추가
          parameters: parameters,
          modelParams: parameters,  // modelParams로도 전달
          styleId: styleId
        })
      });

      if (!modelResponse.ok) {
        const errorText = await modelResponse.text();
        console.error(`${modelName} generation failed:`, errorText);
        
        // DB 상태 업데이트
        await supabaseAdmin
          .from('gen_videos')
          .update({
            generation_status: 'failed',
            metadata: {
              ...videoRecord.metadata,
              error: errorText,
              model: modelName
            }
          })
          .eq('id', videoRecord.id);
          
        throw new Error(`${modelName} generation failed: ${errorText}`);
      }

      const modelResult = await modelResponse.json();
      
      // 4. 성공 응답 반환
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            id: videoRecord.id,
            request_id: modelResult.request_id || modelResult.generationId,
            status: modelResult.status || 'processing',
            message: modelResult.message || `${modelName} 비디오 생성이 시작되었습니다.`,
            model: modelName,
            modelFunction: modelFunction
          }
        })
      };
      
    } catch (routingError) {
      console.error(`Error routing to ${modelFunction}:`, routingError);
      
      // 함수가 아직 구현되지 않은 경우
      if (routingError.message.includes('404') || routingError.message.includes('Not Found')) {
        console.warn(`${modelFunction} not implemented yet, using fallback`);
        
        // DB 상태 업데이트
        await supabaseAdmin
          .from('gen_videos')
          .update({
            generation_status: 'failed',
            metadata: {
              ...videoRecord.metadata,
              error: `${modelName} 모델은 아직 구현되지 않았습니다.`,
              model: modelName
            }
          })
          .eq('id', videoRecord.id);
        
        return {
          statusCode: 501,
          headers,
          body: JSON.stringify({
            success: false,
            error: `${modelName} 모델은 현재 준비 중입니다.`
          })
        };
      }
      
      throw routingError;
    }

  } catch (error) {
    console.error('Error in generateVideoAsync router:', error.message || error);
    
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error.';
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    };
  }
};