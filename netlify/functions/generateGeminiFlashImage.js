// Google Gemini 2.5 Flash Image Preview를 직접 사용하는 이미지 생성
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const IMAGE_GENERATION_COST = 100; // Gemini 2.5 Flash Image Preview 생성 비용

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

  let user;
  let userProfile;
  let dbImage;

  try {
    // 인증 확인
    const authHeader = event.headers.authorization;
    if (!authHeader) throw { statusCode: 401, message: 'Authorization header is missing.' };
    
    const token = authHeader.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Token is missing.' };
    
    user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    if (!user || !user.sub) throw { statusCode: 401, message: 'Invalid token payload.' };

    // 크레딧 확인 및 차감
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('user_id', user.sub)
      .single();
    
    if (profileError) throw new Error('사용자 프로필을 찾을 수 없습니다.');
    userProfile = profile;

    if (userProfile.credits < IMAGE_GENERATION_COST) {
      return { 
        statusCode: 402, 
        headers, 
        body: JSON.stringify({ error: '크레딧이 부족합니다.' }) 
      };
    }
    
    // 크레딧 차감
    await supabaseAdmin
      .from('profiles')
      .update({ credits: userProfile.credits - IMAGE_GENERATION_COST })
      .eq('user_id', user.sub);

    // 요청 데이터 파싱
    const requestBody = JSON.parse(event.body);
    const { 
      prompt,
      referenceImages = [],
      imageSize = '1:1',
      style,
      projectId,
      sceneNumber,
      sceneId,
      sceneName,
      category = 'scene',
      elementName,
      metadata = {}
    } = requestBody;

    if (!prompt) {
      throw new Error('프롬프트는 필수입니다.');
    }

    console.log('Gemini 2.5 Flash Image Preview 생성 요청:', {
      prompt: prompt.substring(0, 100),
      imageCount: referenceImages?.length || 0,
      imageSize,
      style: style?.name || 'none',
      projectId,
      sceneNumber
    });

    // Google API 키 확인
    const apiKey = process.env.GENERATIVE_LANGUAGE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API 키가 설정되지 않았습니다.');
    }
    
    // GoogleGenAI 클라이언트 초기화
    const ai = new GoogleGenAI({});

    // 스타일이 있는 경우 프롬프트에 추가
    let finalPrompt = prompt;
    if (style && style.prompt_suffix) {
      finalPrompt = `${prompt}, ${style.prompt_suffix}`;
    }

    // 이미지 크기를 픽셀로 변환
    const imageSizeMap = {
      '21:9': { width: 1680, height: 720 },
      '16:9': { width: 1280, height: 720 },
      '4:3': { width: 1024, height: 768 },
      '3:2': { width: 1080, height: 720 },
      '1:1': { width: 1024, height: 1024 },
      '2:3': { width: 720, height: 1080 },
      '3:4': { width: 768, height: 1024 },
      '9:16': { width: 720, height: 1280 },
      '9:21': { width: 720, height: 1680 }
    };

    const dimensions = imageSizeMap[imageSize] || { width: 1024, height: 1024 };

    // element_name 결정 로직
    let finalElementName = elementName;
    if (!finalElementName) {
      if (category === 'scene' && sceneName) {
        finalElementName = sceneName;
      } else if (category === 'scene' && sceneNumber) {
        finalElementName = `씬 ${sceneNumber}`;
      } else if (category === 'character' || category === 'background' || category === 'object') {
        finalElementName = prompt.split(',')[0].substring(0, 50);
      } else {
        finalElementName = prompt.substring(0, 50);
      }
    }

    // 1. gen_images 테이블에 초기 레코드 생성
    const imageRecord = {
      project_id: projectId,
      production_sheet_id: sceneId || sceneNumber,
      scene_number: sceneNumber || null,  // 씬 번호 추가
      element_name: finalElementName,
      image_type: category || 'scene',
      generation_model: 'gemini-25-flash-image-preview',
      prompt_used: finalPrompt,
      custom_prompt: prompt,
      generation_status: 'processing',
      reference_image_url: referenceImages?.[0]?.url || referenceImages?.[0] || null,
      style_id: style?.id || null,
      style_name: style?.name || null,
      metadata: {
        ...metadata,
        aspect_ratio: imageSize,
        resolution: `${dimensions.width}x${dimensions.height}`,
        reference_images: referenceImages || [],
        reference_count: referenceImages?.length || 0,
        model_version: '2.5-flash-image-preview',
        created_by: user.sub,
        api_type: 'google_direct'
      },
      tags: []
    };

    const { data: createdImage, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert([imageRecord])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw new Error(`이미지 레코드 생성 실패: ${dbError.message}`);
    }
    
    dbImage = createdImage;
    console.log('Created image record:', dbImage.id);

    // 2. 프롬프트 준비 (참조 이미지가 있으면 Image-to-Image, 없으면 Text-to-Image)
    let promptContents = [];

    // 참조 이미지가 있는 경우 이미지 편집 모드
    if (referenceImages && referenceImages.length > 0) {
      console.log(`Image-to-Image 모드: ${referenceImages.length}개 참조 이미지`);
      
      // 참조 이미지들을 base64로 변환하여 추가
      for (let i = 0; i < referenceImages.length; i++) {
        try {
          const imageUrl = typeof referenceImages[i] === 'string' ? referenceImages[i] : 
                          referenceImages[i].url || referenceImages[i].storage_image_url || referenceImages[i].result_image_url;
          
          if (imageUrl) {
            const response = await fetch(imageUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const base64Image = Buffer.from(arrayBuffer).toString('base64');
              
              promptContents.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              });
              
              console.log(`참조 이미지 ${i + 1} 처리 완료`);
            }
          }
        } catch (error) {
          console.warn(`참조 이미지 ${i + 1} 처리 실패:`, error);
        }
      }

      // 이미지 편집 프롬프트 추가
      promptContents.push({ 
        text: `Based on the provided reference image(s), create a new image: ${finalPrompt}` 
      });
    } else {
      // Text-to-Image 모드
      console.log('Text-to-Image 모드');
      promptContents.push({ text: finalPrompt });
    }

    console.log('Gemini 2.5 Flash Image Preview 요청:', {
      model: 'gemini-2.5-flash-image-preview',
      hasReferenceImages: promptContents.length > 1,
      promptLength: finalPrompt.length
    });

    // 3. 백그라운드에서 이미지 생성 처리
    processImageGeneration(dbImage.id, promptContents, supabaseAdmin, ai);

    // 4. 즉시 응답 반환 (다른 모델들과 동일한 패턴)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          ...dbImage,
          status: 'processing',
          message: 'Gemini 2.5 Flash Image Preview 이미지 생성이 시작되었습니다.'
        }
      })
    };

  } catch (error) {
    console.error('Gemini 2.5 Flash Image Preview 생성 실패:', error);
    
    // 크레딧 복구
    if (userProfile) {
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ credits: userProfile.credits })
          .eq('user_id', user.sub);
      } catch (refundError) {
        console.error('크레딧 복구 실패:', refundError);
      }
    }
    
    // DB에 실패 상태 기록
    if (dbImage?.id) {
      await supabaseAdmin
        .from('gen_images')
        .update({
          generation_status: 'failed',
          error_message: error.message || 'Unknown error'
        })
        .eq('id', dbImage.id);
    }
    
    const statusCode = error.statusCode || 500;
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: error.message || '이미지 생성 중 오류가 발생했습니다.' 
      })
    };
  }
};

// 백그라운드에서 이미지 생성을 처리하는 함수
async function processImageGeneration(imageId, promptContents, supabaseAdmin, ai) {
  try {
    console.log('Background image generation started for ID:', imageId);
    
    // Gemini 2.5 Flash Image Preview로 이미지 생성
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: promptContents,
    });

    // 응답 처리
    let imageUrl = null;
    let textResponse = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        textResponse = part.text;
        console.log('Generated text:', part.text.substring(0, 100));
      } else if (part.inlineData) {
        // base64 이미지 데이터를 Supabase Storage에 업로드
        const imageData = part.inlineData.data;
        console.log('Generated image data received, uploading to storage...');
        
        try {
          // Base64를 Buffer로 변환
          const buffer = Buffer.from(imageData, 'base64');
          const fileName = `gemini-flash-${imageId}-${Date.now()}.png`;
          
          // Supabase Storage에 업로드
          const { error: uploadError } = await supabaseAdmin.storage
            .from('generated-images')
            .upload(fileName, buffer, {
              contentType: 'image/png',
              cacheControl: '3600'
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            // 업로드 실패 시 Base64 Data URL 사용 (백업)
            imageUrl = `data:image/png;base64,${imageData}`;
          } else {
            // 업로드 성공 시 공개 URL 생성
            const { data: urlData } = supabaseAdmin.storage
              .from('generated-images')
              .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
            console.log('Image uploaded to storage:', imageUrl);
          }
        } catch (storageError) {
          console.error('Storage processing error:', storageError);
          // 저장소 처리 실패 시 Base64 Data URL 사용 (백업)
          imageUrl = `data:image/png;base64,${imageData}`;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('생성된 이미지 데이터를 찾을 수 없습니다.');
    }

    // DB 업데이트 - 성공 (간결하게 타임아웃 방지)
    const { error: updateError } = await supabaseAdmin
      .from('gen_images')
      .update({
        generation_status: 'completed',
        result_image_url: imageUrl,
        storage_image_url: imageUrl,
        metadata: {
          text_response: textResponse,
          completed_at: new Date().toISOString(),
          model_version: '2.5-flash-image-preview'
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', imageId);

    if (updateError) {
      console.error('Background DB update error:', updateError);
      throw updateError;
    }

    console.log('Background image generation completed for ID:', imageId);

  } catch (error) {
    console.error('Background image generation failed for ID:', imageId, error);
    
    // DB 업데이트 - 실패 (재시도 포함)
    try {
      await supabaseAdmin
        .from('gen_images')
        .update({
          generation_status: 'failed',
          error_message: error.message || 'Background generation failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId);
      
      console.log('Failed status updated successfully for ID:', imageId);
    } catch (statusUpdateError) {
      console.error('Failed to update failure status for ID:', imageId, statusUpdateError);
      
      // 최후의 재시도 - 간단한 상태 업데이트만
      try {
        await supabaseAdmin
          .from('gen_images')
          .update({ generation_status: 'failed' })
          .eq('id', imageId);
      } catch (finalError) {
        console.error('Final status update failed for ID:', imageId, finalError);
      }
    }
  }
}