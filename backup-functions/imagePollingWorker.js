// 이미지 생성 상태를 주기적으로 확인하는 워커 함수
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    console.log('Starting image polling worker...');
    
    // processing 상태인 이미지들 조회
    const { data: processingImages, error: fetchError } = await supabaseAdmin
      .from('gen_images')
      .select('*')
      .in('generation_status', ['pending', 'processing'])
      .not('request_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5); // 한 번에 5개까지만 처리

    if (fetchError) {
      throw fetchError;
    }

    if (!processingImages || processingImages.length === 0) {
      console.log('No images to process');
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

    console.log(`Found ${processingImages.length} images to process`);
    
    // 각 이미지의 상태 확인
    const results = await Promise.allSettled(
      processingImages.map(async (image) => {
        if (!image.metadata?.status_url && !image.request_id) {
          console.log(`Image ${image.id} has no status URL or request ID`);
          return { id: image.id, status: 'no_status_url' };
        }

        try {
          // FAL AI 상태 확인 - request_id 기반
          let statusUrl = image.metadata?.status_url;
          
          // status_url이 없으면 request_id로 생성
          if (!statusUrl && image.request_id) {
            // FAL AI의 기본 status URL 패턴
            // 모델에 따라 URL 패턴이 다를 수 있음
            const modelName = image.generation_model || 'gpt-image-1';
            if (modelName.includes('flux')) {
              statusUrl = `https://queue.fal.run/fal-ai/flux-pro/requests/${image.request_id}/status`;
            } else {
              statusUrl = `https://queue.fal.run/fal-ai/requests/${image.request_id}/status`;
            }
          }
          
          console.log(`Checking status for image ${image.id} at ${statusUrl}`);
          
          const statusResponse = await fetch(statusUrl, {
            headers: {
              'Authorization': `Key ${process.env.FAL_API_KEY}`
            }
          });

          if (!statusResponse.ok) {
            console.error(`Failed to check status for image ${image.id}:`, statusResponse.status);
            return { id: image.id, status: 'error', error: 'Status check failed' };
          }

          const statusData = await statusResponse.json();
          console.log(`Status for image ${image.id}:`, statusData);
          
          // FAL AI 응답 형식 처리 (다양한 형식 지원)
          // 1. statusData.status가 있는 경우
          // 2. statusData.state가 있는 경우 (flux 모델)
          const status = statusData.status || statusData.state;
          const isCompleted = status === 'completed' || status === 'succeeded' || status === 'IN_QUEUE';
          
          // 이미지 URL 찾기 (다양한 형식 지원)
          let imageUrls = [];
          if (statusData.images && Array.isArray(statusData.images)) {
            imageUrls = statusData.images.map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
          } else if (statusData.output && statusData.output.images) {
            imageUrls = statusData.output.images.map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
          } else if (statusData.result && statusData.result.images) {
            imageUrls = statusData.result.images.map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
          }
          
          // 완료된 경우
          if (isCompleted && imageUrls.length > 0) {
            const imageUrl = imageUrls[0];
            console.log(`Image ${image.id} completed, downloading from ${imageUrl}`);
            
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
            const model = image.generation_model;
            if (model?.includes('flux-') && model !== 'flux-schnell') {
              extension = 'jpg';
              uploadContentType = 'image/jpeg';
            }
            
            const imageBlob = await imageResponse.blob();
            const imageBuffer = await imageBlob.arrayBuffer();
            const imageData = Buffer.from(imageBuffer);
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 9);
            const fileName = `${image.project_id}/${image.image_type}/${timestamp}-${randomId}.${extension}`;
            
            const { data: uploadData, error: uploadError } = await supabaseAdmin
              .storage
              .from('gen-images')
              .upload(fileName, imageData, {
                contentType: uploadContentType,
                upsert: false
              });

            if (uploadError) {
              console.error('Storage upload error:', uploadError);
              throw uploadError;
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

            // 기존 태그와 병합
            const existingTags = image.tags || [];
            const allTags = [...new Set([...existingTags, ...extractedTags])];

            // DB 업데이트 - Realtime이 자동으로 프론트엔드에 알림
            await supabaseAdmin
              .from('gen_images')
              .update({
                generation_status: 'completed',
                result_image_url: imageUrl,
                storage_image_url: publicUrl,
                thumbnail_url: publicUrl,
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

            console.log(`Image ${image.id} completed and updated`);
            return { id: image.id, status: 'completed' };
          }
          
          // 실패한 경우
          const isFailed = status === 'failed' || status === 'error' || status === 'FAILED';
          if (isFailed) {
            console.log(`Image ${image.id} failed`);
            const errorMessage = statusData.error || statusData.message || 'Generation failed';
            await supabaseAdmin
              .from('gen_images')
              .update({
                generation_status: 'failed',
                metadata: {
                  ...image.metadata,
                  error: errorMessage,
                  failed_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', image.id);

            return { id: image.id, status: 'failed' };
          }
          
          // 아직 처리 중
          console.log(`Image ${image.id} still processing`);
          return { id: image.id, status: 'processing' };
          
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
      failed: results.filter(r => r.value?.status === 'failed').length,
      processing: results.filter(r => r.value?.status === 'processing').length,
      errors: results.filter(r => r.status === 'rejected').length
    };

    console.log('Polling summary:', summary);

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
    console.error('Error in imagePollingWorker:', error);
    
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