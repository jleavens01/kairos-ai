// 백그라운드에서 이미지 생성 상태를 확인하는 워커 함수
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
        if (!image.metadata?.status_url) {
          return { id: image.id, status: 'no_status_url' };
        }

        try {
          // FAL AI 상태 확인
          const statusResponse = await fetch(image.metadata.status_url, {
            headers: {
              'Authorization': `Key ${process.env.FAL_API_KEY}`
            }
          });

          if (!statusResponse.ok) {
            throw new Error('Failed to check FAL AI status');
          }

          const statusData = await statusResponse.json();
          console.log(`Status for image ${image.id}:`, statusData);
          
          // FAL AI 응답 구조 확인 및 처리
          // FAL AI는 완료 시 바로 결과를 반환 (status 필드가 없을 수 있음)
          // FAL AI는 대문자 상태 코드를 사용 (COMPLETED, IN_PROGRESS 등)
          const isCompleted = statusData.images || statusData.output || statusData.image || 
                            (statusData.status && (statusData.status === 'completed' || statusData.status === 'COMPLETED'));
          
          // 완료된 경우
          if (isCompleted) {
            // 다양한 응답 형식 처리
            let imageUrl = null;
            
            // COMPLETED 상태이지만 실제 결과가 없는 경우 response_url에서 가져오기
            if (statusData.status === 'COMPLETED' && !statusData.images && !statusData.output && statusData.response_url) {
              console.log('Fetching completed result from response_url:', statusData.response_url);
              const resultResponse = await fetch(statusData.response_url, {
                headers: {
                  'Authorization': `Key ${process.env.FAL_API_KEY}`
                }
              });
              
              if (resultResponse.ok) {
                const resultData = await resultResponse.json();
                console.log('Result from response_url:', resultData);
                
                if (resultData.images && resultData.images.length > 0) {
                  imageUrl = resultData.images[0].url || resultData.images[0];
                } else if (resultData.output) {
                  imageUrl = resultData.output.url || resultData.output;
                } else if (resultData.image) {
                  imageUrl = resultData.image.url || resultData.image;
                }
              }
            } else if (statusData.images && statusData.images.length > 0) {
              imageUrl = statusData.images[0].url || statusData.images[0];
            } else if (statusData.output) {
              imageUrl = statusData.output.url || statusData.output;
            } else if (statusData.image) {
              imageUrl = statusData.image.url || statusData.image;
            } else if (typeof statusData === 'string') {
              imageUrl = statusData;
            }
            
            if (!imageUrl) {
              console.error('No image URL found in response:', statusData);
              throw new Error('No image URL in response');
            }
            
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
              .from('gen-images')
              .upload(fileName, imageData, {
                contentType: 'image/png',
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

            return { id: image.id, status: 'completed' };
          }
          
          // 실패한 경우 (대소문자 모두 처리)
          const isFailed = statusData.status === 'failed' || 
                          statusData.status === 'FAILED' ||
                          statusData.status === 'error' ||
                          statusData.status === 'ERROR' ||
                          statusData.error;
          
          if (isFailed) {
            await supabaseAdmin
              .from('gen_images')
              .update({
                generation_status: 'failed',
                metadata: {
                  ...image.metadata,
                  error: statusData.error || statusData.message || 'Generation failed',
                  failed_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', image.id);

            return { id: image.id, status: 'failed' };
          }
          
          // 아직 처리 중 (IN_QUEUE, IN_PROGRESS 등 - 대소문자 모두 처리)
          const isProcessing = statusData.status === 'IN_QUEUE' || 
                             statusData.status === 'IN_PROGRESS' ||
                             statusData.status === 'processing' ||
                             statusData.status === 'PROCESSING' ||
                             statusData.status === 'pending' ||
                             statusData.status === 'PENDING';
          
          if (isProcessing) {
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
      processing: results.filter(r => r.value?.status === 'processing').length,
      unknown: results.filter(r => r.value?.status === 'unknown').length,
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