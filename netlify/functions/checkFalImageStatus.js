// FAL AI 이미지 생성 상태 확인 함수 (개발 환경용)
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { fal } from "@fal-ai/client";

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

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

    const { imageId } = JSON.parse(event.body || '{}');

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
          error: imageRecord.error_message || 'Generation failed'
        })
      };
    }

    // FAL AI 상태 확인 (request_id가 있는 경우)
    if (imageRecord.request_id) {
      console.log('Checking FAL AI status for request:', imageRecord.request_id);
      
      // 모델별 엔드포인트 결정
      let apiEndpoint;
      const model = imageRecord.generation_model;
      
      if (model === 'gpt-image-1') {
        // 참조 이미지 여부에 따라 엔드포인트 결정
        const hasReferenceImages = imageRecord.reference_image_url || 
                                  (imageRecord.metadata?.reference_images && 
                                   imageRecord.metadata.reference_images.length > 0);
        apiEndpoint = hasReferenceImages 
          ? "fal-ai/gpt-image-1/edit-image/byok"
          : "fal-ai/gpt-image-1/text-to-image/byok";
      } else if (model === 'flux-schnell') {
        apiEndpoint = "fal-ai/flux/schnell";
      } else if (model === 'flux-pro') {
        apiEndpoint = "fal-ai/flux-pro";
      } else if (model === 'flux-kontext') {
        apiEndpoint = "fal-ai/flux-pro/kontext";
      } else if (model === 'flux-kontext-multi') {
        apiEndpoint = "fal-ai/flux-pro/kontext/max/multi";
      } else {
        throw new Error(`Unknown model: ${model}`);
      }

      try {
        // FAL AI 상태 확인
        const status = await fal.queue.status(apiEndpoint, { 
          requestId: imageRecord.request_id 
        });
        
        console.log('FAL AI Status:', status);

        if (status.status === 'COMPLETED') {
          // 결과 가져오기
          const result = await fal.queue.result(apiEndpoint, { 
            requestId: imageRecord.request_id 
          });
          
          console.log('FAL AI result structure:', JSON.stringify(result, null, 2));
          
          // 이미지 URL 추출
          const imageUrl = result.images?.[0]?.url || 
                         result.images?.[0] || 
                         result.image?.url || 
                         result.image_url || 
                         result.url ||
                         result.output;
          
          if (imageUrl) {
            // 이미지를 Supabase Storage에 저장
            let storageUrl = imageUrl; // 기본값은 원본 URL
            
            try {
              // 이미지 다운로드
              const imageResponse = await fetch(imageUrl);
              if (!imageResponse.ok) {
                throw new Error('Failed to fetch generated image');
              }
              
              const imageBuffer = await imageResponse.arrayBuffer();
              const uint8Array = new Uint8Array(imageBuffer);
              
              // 파일명 생성
              const timestamp = Date.now();
              const fileName = `${timestamp}_${imageRecord.id}.png`;
              const storagePath = `gen-images/${imageRecord.project_id}/${imageRecord.image_type}/${fileName}`;
              
              // Supabase Storage에 업로드
              const { data: uploadData, error: uploadError } = await supabaseAdmin
                .storage
                .from('projects')
                .upload(storagePath, uint8Array, {
                  contentType: 'image/png',
                  cacheControl: '3600',
                  upsert: true
                });
              
              if (uploadError) {
                console.error('Storage upload error:', uploadError);
              } else {
                // 공개 URL 생성
                const { data: { publicUrl } } = supabaseAdmin
                  .storage
                  .from('projects')
                  .getPublicUrl(storagePath);
                
                storageUrl = publicUrl;
                console.log('Image saved to storage:', storageUrl);
              }
            } catch (storageError) {
              console.error('Failed to save image to storage:', storageError);
            }
            
            // 썸네일 생성 (Canvas API 사용)
            let thumbnailUrl = null;
            try {
              // 원본 이미지를 다시 가져와서 썸네일 생성
              if (storageUrl) {
                const thumbnailBuffer = await generateThumbnail(uint8Array, 300, 300);
                const thumbnailFileName = `thumb_${fileName}`;
                const thumbnailPath = `gen-images/${imageRecord.project_id}/${imageRecord.image_type}/thumbs/${thumbnailFileName}`;
                
                const { error: thumbUploadError } = await supabaseAdmin
                  .storage
                  .from('projects')
                  .upload(thumbnailPath, thumbnailBuffer, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true
                  });
                
                if (!thumbUploadError) {
                  const { data: { publicUrl: thumbPublicUrl } } = supabaseAdmin
                    .storage
                    .from('projects')
                    .getPublicUrl(thumbnailPath);
                  thumbnailUrl = thumbPublicUrl;
                  console.log('Thumbnail created:', thumbnailUrl);
                }
              }
            } catch (thumbError) {
              console.warn('Failed to create thumbnail:', thumbError);
            }

            // DB 업데이트
            const { data: updatedRecord, error: updateError } = await supabaseAdmin
              .from('gen_images')
              .update({
                generation_status: 'completed',
                result_image_url: imageUrl,
                thumbnail_url: thumbnailUrl,
                backup_storage_url: storageUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', imageId)
              .select()
              .single();

            if (updateError) {
              console.error('Failed to update image record:', updateError);
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
          } else {
            console.error('No image URL found in result:', result);
            throw new Error('Image URL not found in generation result');
          }
        } else if (status.status === 'FAILED') {
          // 실패 상태로 업데이트
          await supabaseAdmin
            .from('gen_images')
            .update({
              generation_status: 'failed',
              error_message: 'FAL AI generation failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', imageId);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              status: 'failed',
              error: 'Image generation failed'
            })
          };
        } else {
          // 아직 진행 중
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              status: 'processing',
              message: '이미지 생성 중입니다...',
              progress: status.progress || null
            })
          };
        }
      } catch (falError) {
        console.error('FAL AI status check error:', falError);
        
        // FAL API 오류여도 DB 상태는 유지
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            status: 'processing',
            message: '상태 확인 중...'
          })
        };
      }
    }

    // request_id가 없는 경우
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: imageRecord.generation_status || 'unknown',
        data: imageRecord
      })
    };

  } catch (error) {
    console.error('Error in checkFalImageStatus:', error.message || error);
    
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