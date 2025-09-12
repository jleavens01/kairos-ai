// AI 이미지 생성 함수
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
      model = 'gpt-image-1',
      imageSize = '1024x1024',
      category = 'scene',
      characterName,
      parameters = {},
      referenceImages = [],
      sceneId = null,
      sceneNumber = null,
      sceneName = null
    } = JSON.parse(event.body || '{}');

    if (!projectId || !prompt) {
      throw new Error('projectId and prompt are required.');
    }

    console.log('Image generation request:', {
      projectId,
      model,
      imageSize,
      category,
      hasReferenceImages: referenceImages.length > 0
    });

    // FAL AI API 호출 준비
    let apiEndpoint;
    let requestBody;

    // 모델별 API 설정
    if (model === 'flux-pro') {
      // Flux Pro 기본 모델 (참조 이미지 없음)
      apiEndpoint = 'https://queue.fal.run/fal-ai/flux-pro';
      requestBody = {
        prompt: prompt,
        image_size: imageSize, // Flux는 비율 형식 사용 (예: "16:9")
        num_inference_steps: parameters.steps || 28,
        guidance_scale: parameters.guidance_scale || 3.5,
        num_images: 1,
        safety_tolerance: parameters.safety_tolerance || 2,
        seed: parameters.seed || Math.floor(Math.random() * 1000000)
      };
      
    } else if (model === 'flux-kontext') {
      // Flux Kontext (단일 참조 이미지)
      if (!referenceImages.length) {
        throw new Error('Flux Kontext requires at least one reference image.');
      }
      
      apiEndpoint = 'https://queue.fal.run/fal-ai/flux-pro/kontext';
      requestBody = {
        prompt: prompt,
        image_url: referenceImages[0], // 단일 이미지 URL
        guidance_scale: parameters.guidance_scale || 3.5,
        safety_tolerance: parameters.safety_tolerance || 2,
        num_images: 1,
        seed: parameters.seed || Math.floor(Math.random() * 1000000)
      };
      
    } else if (model === 'flux-kontext-multi') {
      // Flux Kontext Multi (다중 참조 이미지)
      if (!referenceImages.length) {
        throw new Error('Flux Kontext Multi requires reference images.');
      }
      
      apiEndpoint = 'https://queue.fal.run/fal-ai/flux-pro/kontext/max/multi';
      requestBody = {
        prompt: prompt,
        image_urls: referenceImages, // 이미지 URL 배열
        guidance_scale: parameters.guidance_scale || 3.5,
        safety_tolerance: parameters.safety_tolerance || 2,
        num_images: 1,
        seed: parameters.seed || Math.floor(Math.random() * 1000000)
      };
      
    } else {
      // 기본 GPT-Image-1 모델
      apiEndpoint = 'https://queue.fal.run/fal-ai/gpt-image-1/generate';
      requestBody = {
        prompt: prompt,
        size: imageSize,
        num_images: 1,
        openai_api_key: process.env.OPENAI_API_KEY
      };
      
      // 참조 이미지가 있으면 edit-image API 사용
      if (referenceImages.length > 0) {
        apiEndpoint = 'https://queue.fal.run/fal-ai/gpt-image-1/edit-image/byok';
        requestBody.image_urls = referenceImages;
      }
    }

    console.log('FAL API Request:', {
      endpoint: apiEndpoint,
      model: model
    });

    // FAL AI API 호출
    const falResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('FAL API Error:', errorText);
      throw new Error(`FAL AI API request failed: ${errorText}`);
    }

    const falResult = await falResponse.json();
    console.log('FAL API Response:', falResult);

    // 비동기 작업 처리 (queue 응답인 경우)
    if (falResult.request_id && falResult.status_url) {
      // 폴링으로 결과 대기
      let imageUrl = null;
      let attempts = 0;
      const maxAttempts = 60; // 최대 60초 대기

      while (!imageUrl && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        
        const statusResponse = await fetch(falResult.status_url, {
          headers: {
            'Authorization': `Key ${process.env.FAL_API_KEY}`
          }
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`Polling attempt ${attempts + 1}:`, statusData.status);
          
          if (statusData.status === 'completed' && statusData.images) {
            imageUrl = statusData.images[0].url;
            break;
          } else if (statusData.status === 'failed') {
            throw new Error('Image generation failed.');
          }
        }
        
        attempts++;
      }
      
      if (!imageUrl) {
        throw new Error('Image generation timed out.');
      }
      
      // 이미지 URL 설정
      falResult.image_url = imageUrl;
    } else if (falResult.images && falResult.images.length > 0) {
      // 동기 응답인 경우
      falResult.image_url = falResult.images[0].url;
    } else {
      throw new Error('No image URL in response.');
    }

    // Supabase Storage에 이미지 저장
    const imageResponse = await fetch(falResult.image_url);
    
    // 실제 이미지 형식 감지
    const contentType = imageResponse.headers.get('content-type');
    const isJpeg = contentType?.includes('jpeg') || contentType?.includes('jpg');
    const isPng = contentType?.includes('png');
    const isWebp = contentType?.includes('webp');
    
    // 확장자와 ContentType 동적 설정
    let extension = 'png'; // 기본값
    let uploadContentType = 'image/png'; // 기본값
    
    if (isJpeg) {
      extension = 'jpg';
      uploadContentType = 'image/jpeg';
    } else if (isWebp) {
      extension = 'webp';
      uploadContentType = 'image/webp';
    } else if (isPng) {
      extension = 'png';
      uploadContentType = 'image/png';
    }
    
    // Flux 모델의 경우 JPEG 형식 강제 (output_format 설정에 따라)
    if (model.includes('flux-') && model !== 'flux-schnell') {
      extension = 'jpg';
      uploadContentType = 'image/jpeg';
    }
    
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageData = Buffer.from(imageBuffer);
    
    const timestamp = Date.now();
    const fileName = `${projectId}/${category}/${timestamp}.${extension}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('gen-images')
      .upload(fileName, imageData, {
        contentType: uploadContentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload image to storage.');
    }

    // Storage URL 생성
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('gen-images')
      .getPublicUrl(fileName);

    // 데이터베이스에 이미지 정보 저장 (gen_images 테이블 사용)
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert({
        project_id: projectId,
        production_sheet_id: sceneId,
        image_type: category, // category를 image_type으로 매핑
        element_name: category === 'scene' ? 
          (sceneName || (sceneNumber ? `씬 ${sceneNumber}` : '제목 없음')) : 
          (characterName || prompt.substring(0, 100)),
        generation_status: 'completed',
        result_image_url: falResult.image_url,
        
        thumbnail_url: publicUrl,
        prompt_used: prompt,
        generation_model: model,
        model_parameters: parameters,
        reference_image_url: referenceImages[0] || null,
        metadata: {
          width: imageSize.includes('x') ? parseInt(imageSize.split('x')[0]) : null,
          height: imageSize.includes('x') ? parseInt(imageSize.split('x')[1]) : null,
          aspect_ratio: imageSize.includes(':') ? imageSize : null,
          reference_images: referenceImages,
          created_by: user.sub,
          image_size: imageSize
        },
        tags: category === 'character' && characterName ? [characterName] : []
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Storage에서 파일 삭제 (롤백)
      await supabaseAdmin.storage
        .from('gen-images')
        .remove([fileName]);
      throw new Error('Failed to save image record.');
    }

    console.log('Image generated successfully:', {
      id: imageRecord.id,
      url: publicUrl
    });

    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: imageRecord
      })
    };

  } catch (error) {
    console.error('Error in generateImage function:', error.message || error);
    
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