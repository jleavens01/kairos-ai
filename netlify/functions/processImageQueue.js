// 백그라운드에서 이미지 생성 상태를 확인하는 워커 함수
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fal } from '@fal-ai/client';

// FAL AI 클라이언트 설정
fal.config({
  credentials: process.env.FAL_API_KEY
});

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    // processing 상태인 이미지들 조회
    const { data: processingImages, error: fetchError } = await supabaseAdmin
      .from('gen_images')
      .select('*')
      .in('generation_status', ['pending', 'processing'])
      .not('request_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(10); // 한 번에 10개까지만 처리

    if (fetchError) {
      throw fetchError;
    }

    if (!processingImages || processingImages.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No images to process',
          processed: 0
        })
      };
    }

    console.log(`Processing ${processingImages.length} images`);
    
    // 각 이미지의 상태 확인
    const results = await Promise.allSettled(
      processingImages.map(async (image) => {
        // request_id가 없으면 스킵
        if (!image.request_id) {
          console.log(`Image ${image.id} has no request_id`);
          return { id: image.id, status: 'no_request_id' };
        }

        try {
          // FAL AI SDK로 상태 확인
          // 모델별로 엔드포인트가 다름
          let apiEndpoint;
          if (image.generation_model === 'gpt-image-1') {
            // GPT 이미지는 참조 이미지 여부에 따라 엔드포인트가 다름
            if (image.reference_image_url) {
              apiEndpoint = 'fal-ai/gpt-image-1/edit-image/byok';
            } else {
              apiEndpoint = 'fal-ai/gpt-image-1/text-to-image/byok';
            }
          } else if (image.generation_model?.includes('flux')) {
            // Flux 모델들
            if (image.generation_model === 'flux-schnell') {
              apiEndpoint = 'fal-ai/flux/schnell';
            } else if (image.generation_model === 'flux-pro') {
              apiEndpoint = 'fal-ai/flux-pro';
            } else if (image.generation_model === 'flux-kontext') {
              apiEndpoint = 'fal-ai/flux-pro/kontext';
            } else if (image.generation_model === 'flux-kontext-multi') {
              apiEndpoint = 'fal-ai/flux-pro/kontext/max/multi';
            } else {
              apiEndpoint = 'fal-ai/flux/schnell'; // 기본값
            }
          } else {
            // 알 수 없는 모델
            console.log(`Unknown model for image ${image.id}: ${image.generation_model}`);
            return { id: image.id, status: 'unknown_model' };
          }

          console.log(`Checking status for image ${image.id} with model ${image.generation_model} at ${apiEndpoint}`);
          
          let statusData;
          try {
            // FAL AI SDK로 상태 확인
            statusData = await fal.queue.status(apiEndpoint, { 
              requestId: image.request_id 
            });
            
            console.log(`Status for image ${image.id}:`, statusData.status);
          } catch (statusError) {
            console.error(`FAL AI status check error for ${image.id}:`, statusError);
            
            // 422 에러나 다른 FAL AI 에러 처리
            if (statusError.status === 422 || statusError.message?.includes('422')) {
              console.log(`🚫 422 validation error for image ${image.id} - prompt: ${image.prompt?.substring(0, 50)}...`);
              
              await supabaseAdmin
                .from('gen_images')
                .update({
                  generation_status: 'failed',
                  metadata: {
                    ...image.metadata,
                    error: 'Invalid request parameters (422)',
                    error_details: statusError.message || 'Request validation failed',
                    failed_at: new Date().toISOString()
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', image.id);
              
              return { id: image.id, status: 'failed', error: '422 validation error' };
            } else if (statusError.status === 404 || statusError.message?.includes('not found')) {
              // 404 - 요청 ID를 찾을 수 없음
              await supabaseAdmin
                .from('gen_images')
                .update({
                  generation_status: 'failed',
                  metadata: {
                    ...image.metadata,
                    error: 'Request not found (404)',
                    error_details: statusError.message || 'Request ID not found in FAL AI',
                    failed_at: new Date().toISOString()
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', image.id);
              
              return { id: image.id, status: 'failed', error: '404 not found' };
            } else {
              // 기타 FAL AI 에러
              throw statusError;
            }
          }
          
          // 상태별 처리
          const status = statusData.status;
          
          // 완료된 경우
          if (status === 'COMPLETED') {
            // FAL AI SDK로 결과 가져오기
            const result = await fal.queue.result(apiEndpoint, { 
              requestId: image.request_id 
            });
            
            console.log(`Result for image ${image.id}:`, JSON.stringify(result, null, 2));
            
            // 다양한 응답 형식 처리 (FAL AI의 result.data 구조 처리)
            let imageUrl = null;
            const responseData = result.data || result;
            
            if (responseData.images && responseData.images.length > 0) {
              // GPT-Image-1 형식: data.images[0].url
              imageUrl = responseData.images[0].url || responseData.images[0];
            } else if (responseData.output) {
              imageUrl = responseData.output.url || responseData.output;
            } else if (responseData.image) {
              imageUrl = responseData.image.url || responseData.image;
            } else if (responseData.image_url) {
              imageUrl = responseData.image_url;
            } else if (responseData.url) {
              imageUrl = responseData.url;
            } else if (typeof responseData === 'string') {
              imageUrl = responseData;
            }
            
            if (!imageUrl) {
              console.error('No image URL found in response:', statusData);
              throw new Error('No image URL in response');
            }
            
            // Storage 업로드 시도 (실패해도 FAL URL 사용)
            let storageUrl = imageUrl; // 기본값은 FAL AI URL
            let imageData = null;
            
            try {
              // 이미지를 Supabase Storage에 저장
            const imageResponse = await fetch(imageUrl);
            const imageBlob = await imageResponse.blob();
            const imageBuffer = await imageBlob.arrayBuffer();
            const imageData = Buffer.from(imageBuffer);
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 9);
            const fileName = `${image.project_id}/${image.image_type}/${timestamp}-${randomId}.png`;
            
            const { data: uploadData, error: uploadError } = await supabaseAdmin
              .storage
              .from('gen-images')  // gen-images 버킷 사용
              .upload(fileName, imageData, {
                contentType: 'image/png',
                upsert: false
              });

            if (uploadError) {
              console.error('Storage upload error (using FAL URL instead):', uploadError.message);
              // Storage 업로드 실패해도 FAL AI URL을 사용하여 계속 진행
            } else {
              // Storage URL 생성 성공
              const { data: { publicUrl } } = supabaseAdmin
                .storage
                .from('gen-images')
                .getPublicUrl(fileName);
              
              if (publicUrl) {
                storageUrl = publicUrl;
                console.log('Image saved to storage:', storageUrl);
              }
            }
            } catch (storageError) {
              console.error('Storage operation failed (using FAL URL):', storageError.message);
              // Storage 실패해도 계속 진행
            }


            // Gemini 1.5를 사용한 태그 추출 (선택적)
            let extractedTags = [];
            if (imageData) {
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
              
              // 태그 추출 프롬프트 (한글 5개)
              const tagPrompt = `이 AI 생성 이미지를 분석하고 가장 중요한 특징을 나타내는 한글 태그 5개를 추출해주세요.

다음 카테고리에서 균형있게 선택해주세요:
1. 스타일 (예: 애니메이션, 실사, 수채화)
2. 주제/대상 (예: 인물, 풍경, 동물)
3. 분위기 (예: 따뜻한, 차가운, 신비로운)
4. 색상 (예: 파란색, 붉은톤, 파스텔)
5. 장면/배경 (예: 실내, 야외, 도시)

JSON 배열 형태로만 반환하고 다른 설명은 하지 마세요.
예시: ["애니메이션", "캐릭터", "따뜻한분위기", "주황색톤", "실내"]

정확히 5개의 간단명료한 한글 태그를 제공해주세요.`;

              const result = await model.generateContent([
                tagPrompt,
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: base64Image
                  }
                }
              ]);

              const response = result.response.text().trim();
              
              // JSON 파싱 시도
              try {
                const jsonMatch = response.match(/\[.*\]/s);
                if (jsonMatch) {
                  extractedTags = JSON.parse(jsonMatch[0]);
                  console.log('Extracted tags:', extractedTags);
                }
              } catch (parseError) {
                console.error('Failed to parse tags:', parseError);
              }
              } catch (geminiError) {
                console.error('Gemini tag extraction failed:', geminiError);
              }
            }

            // 기존 태그와 병합
            const existingTags = image.tags || [];
            const allTags = [...new Set([...existingTags, ...extractedTags])];

            // DB 업데이트 - Realtime이 자동으로 프론트엔드에 알림
            await supabaseAdmin
              .from('gen_images')
              .update({
                generation_status: 'completed',
                result_image_url: imageUrl,
                storage_image_url: storageUrl,  // FAL URL 또는 Storage URL
                thumbnail_url: storageUrl,       // FAL URL 또는 Storage URL
                tags: allTags,
                metadata: {
                  ...image.metadata,
                  gemini_tags: extractedTags,
                  tag_extraction_model: 'gemini-1.5-flash',
                  tag_extracted_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', image.id);

            return { id: image.id, status: 'completed' };
          }
          
          // 실패한 경우
          if (status === 'FAILED' || status === 'ERROR') {
            const errorMessage = statusData.error || statusData.message || statusData.detail || 'Generation failed';
            
            await supabaseAdmin
              .from('gen_images')
              .update({
                generation_status: 'failed',
                metadata: {
                  ...image.metadata,
                  error: errorMessage,
                  error_details: statusData,
                  failed_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', image.id);

            return { id: image.id, status: 'failed', error: errorMessage };
          }
          
          // 아직 처리 중
          if (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
            // processing 상태가 너무 오래되면 타임아웃 처리 (5분)
            const createdAt = new Date(image.created_at);
            const now = new Date();
            const diffMinutes = (now - createdAt) / 1000 / 60;
            
            if (diffMinutes > 5) {
              await supabaseAdmin
                .from('gen_images')
                .update({
                  generation_status: 'failed',
                  metadata: {
                    ...image.metadata,
                    error: 'Generation timeout after 5 minutes',
                    timeout_at: new Date().toISOString()
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', image.id);
              
              return { id: image.id, status: 'timeout' };
            }
            
            return { id: image.id, status: 'processing' };
          }
          
          // 알 수 없는 상태
          console.warn(`Unknown status for image ${image.id}:`, statusData);
          return { id: image.id, status: 'unknown' };
          
        } catch (error) {
          console.error(`Error processing image ${image.id}:`, error);
          return { id: image.id, status: 'error', error: error.message };
        }
      })
    );

    // 결과 집계
    const summary = {
      total: results.length,
      completed: results.filter(r => r.value?.status === 'completed').length,
      failed: results.filter(r => r.value?.status === 'failed' || r.value?.status === 'timeout').length,
      processing: results.filter(r => r.value?.status === 'processing' || r.value?.status === 'IN_PROGRESS' || r.value?.status === 'IN_QUEUE').length,
      unknown: results.filter(r => r.value?.status === 'unknown' || r.value?.status === 'unknown_model' || r.value?.status === 'no_request_id').length,
      errors: results.filter(r => r.status === 'rejected' || r.value?.status === 'error').length,
      pending: 0 // pending은 이미 processing으로 처리됨
    };
    
    console.log('Processing summary:', summary);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        summary,
        results: results.map(r => r.value || { error: r.reason?.message })
      })
    };

  } catch (error) {
    console.error('Error in processImageQueue:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};