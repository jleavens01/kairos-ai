// 이미지 생성 상태 확인 및 완료 처리 함수
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const { imageId, requestId } = JSON.parse(event.body || '{}');

    if (!imageId) {
      throw new Error('imageId is required.');
    }

    // DB에서 이미지 정보 조회
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (dbError || !imageRecord) {
      throw new Error('Image record not found.');
    }

    // 이미 완료된 경우
    if (imageRecord.generation_status === 'completed') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'completed',
          data: imageRecord
        })
      };
    }

    // 실패한 경우
    if (imageRecord.generation_status === 'failed') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          status: 'failed',
          error: imageRecord.metadata?.error || 'Generation failed'
        })
      };
    }

    // FAL AI 상태 확인
    if (imageRecord.request_id && imageRecord.metadata?.status_url) {
      const statusResponse = await fetch(imageRecord.metadata.status_url, {
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check FAL AI status.');
      }

      const statusData = await statusResponse.json();
      console.log('FAL AI Status:', statusData);

      // 완료된 경우
      if (statusData.status === 'completed' && statusData.images && statusData.images.length > 0) {
        const imageUrl = statusData.images[0].url;
        
        // 이미지를 Supabase Storage에 저장
        const imageResponse = await fetch(imageUrl);
        
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
        const model = imageRecord.generation_model;
        if (model?.includes('flux-') && model !== 'flux-schnell') {
          extension = 'jpg';
          uploadContentType = 'image/jpeg';
        }
        
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        const imageData = Buffer.from(imageBuffer);
        
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const fileName = `${imageRecord.project_id}/${imageRecord.image_type}/${timestamp}-${randomId}.${extension}`;
        
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

        // Gemini 1.5를 사용한 태그 추출
        let extractedTags = [];
        try {
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
          const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          });

          // 이미지를 base64로 변환
          const base64Image = imageData.toString('base64');
          
          // 태그 추출 프롬프트
          const tagPrompt = `Analyze this AI-generated image and extract relevant tags.

Provide tags in the following categories:
1. Style tags (art style, visual style, rendering style)
2. Subject tags (main subjects, characters, objects)
3. Mood/Atmosphere tags (emotional tone, atmosphere)
4. Color tags (dominant colors, color scheme)
5. Technical tags (composition, lighting, perspective)

Return ONLY a JSON array of tags without any explanation or markdown formatting.
Example: ["anime style", "character portrait", "warm lighting", "orange tones", "front view"]

Be specific and use commonly understood terms. Limit to 10-15 most relevant tags.`;

          const result = await model.generateContent([
            tagPrompt,
            {
              inlineData: {
                mimeType: uploadContentType || 'image/png',
                data: base64Image
              }
            }
          ]);

          const response = result.response.text().trim();
          console.log('Gemini tag extraction response:', response);
          
          // JSON 파싱 시도
          try {
            // JSON 배열만 추출 (마크다운이나 다른 텍스트 제거)
            const jsonMatch = response.match(/\[.*\]/s);
            if (jsonMatch) {
              extractedTags = JSON.parse(jsonMatch[0]);
              console.log('Extracted tags:', extractedTags);
            }
          } catch (parseError) {
            console.error('Failed to parse tags:', parseError);
            // 태그 추출 실패해도 계속 진행
          }
        } catch (geminiError) {
          console.error('Gemini tag extraction failed:', geminiError);
          // 태그 추출 실패해도 이미지 저장은 계속 진행
        }

        // 기존 태그와 병합 (중복 제거)
        const existingTags = imageRecord.tags || [];
        const allTags = [...new Set([...existingTags, ...extractedTags])];

        // DB 업데이트 - Realtime이 자동으로 프론트엔드에 알림
        const { data: updatedRecord, error: updateError } = await supabaseAdmin
          .from('gen_images')
          .update({
            generation_status: 'completed',
            result_image_url: imageUrl,
            storage_image_url: publicUrl,
            thumbnail_url: publicUrl,
            tags: allTags,
            metadata: {
              ...imageRecord.metadata,
              gemini_tags: extractedTags,
              tag_extraction_model: 'gemini-1.5-flash',
              tag_extracted_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId)
          .select()
          .single();

        if (updateError) {
          throw new Error('Failed to update image record.');
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            status: 'completed',
            data: updatedRecord
          })
        };
      }

      // 실패한 경우
      if (statusData.status === 'failed') {
        await supabaseAdmin
          .from('gen_images')
          .update({
            generation_status: 'failed',
            metadata: {
              ...imageRecord.metadata,
              error: statusData.error || 'Generation failed'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', imageId);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            status: 'failed',
            error: statusData.error || 'Generation failed'
          })
        };
      }

      // 아직 진행 중
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'processing',
          message: '이미지 생성 중입니다...'
        })
      };
    }

    // request_id가 없는 경우
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: imageRecord.generation_status,
        data: imageRecord
      })
    };

  } catch (error) {
    console.error('Error in checkImageStatus function:', error.message || error);
    
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