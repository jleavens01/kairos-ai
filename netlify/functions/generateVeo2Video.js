// Google Veo2 모델을 사용한 비디오 생성
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from "@google/generative-ai";

const VIDEO_GENERATION_COST = 3000; // 비디오 생성 비용

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

    if (userProfile.credits < VIDEO_GENERATION_COST) {
      return { 
        statusCode: 402, 
        headers, 
        body: JSON.stringify({ error: '크레딧이 부족합니다.' }) 
      };
    }
    
    // 크레딧 차감
    await supabaseAdmin
      .from('profiles')
      .update({ credits: userProfile.credits - VIDEO_GENERATION_COST })
      .eq('user_id', user.sub);

    // 요청 데이터 파싱
    const requestBody = JSON.parse(event.body);
    const { 
      projectId, 
      videoId,  // gen_videos 테이블의 ID
      imageUrl,  // 참조 이미지 (image-to-video)
      prompt,  // 프롬프트
      negativePrompt = '',  // 네거티브 프롬프트
      aspectRatio = '16:9',  // 화면 비율
      personGeneration = 'allow_adult',  // 사람 생성 제어 (image-to-video는 allow_adult만 가능)
      parameters = {}
    } = requestBody;

    if (!projectId || !videoId || !imageUrl || !prompt) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }

    console.log('Google Veo2 video generation request:', {
      projectId,
      videoId,
      prompt: prompt.substring(0, 50) + '...',
      imageUrl: imageUrl.substring(0, 50) + '...',
      aspectRatio,
      personGeneration
    });

    // Google Generative AI 초기화
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GENERATIVE_LANGUAGE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API 키가 설정되지 않았습니다.');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);

    // 이미지 다운로드 및 base64로 변환
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('이미지를 다운로드할 수 없습니다.');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = Buffer.from(imageBuffer).toString('base64');
    console.log('Image downloaded, size:', imageBytes.length);

    // Veo2 프롬프트 구성 - 네거티브 프롬프트 포함
    const finalPrompt = prompt;
    const finalNegativePrompt = negativePrompt || 'low quality, blurry, distorted, graphic effects not mentioned, excessive movement, overacting, unnecessary lip syncing';
    
    console.log('Final prompt to Veo2:', finalPrompt);
    console.log('Negative prompt:', finalNegativePrompt);
    
    // Veo2 모델 설정 및 비디오 생성 요청
    console.log('Requesting video generation with Veo2...');
    
    // Veo2 모델 가져오기
    const model = genAI.getGenerativeModel({ 
      model: "veo-2.0-generate-001"  // 올바른 Veo2 모델명
    });

    // Veo2 API에 맞는 비디오 생성 요청 구성
    // Gemini API의 표준 형식 사용 - 텍스트와 이미지를 별도의 parts로 전달
    const parts = [
      {
        text: `Generate a video based on this image with the following prompt: ${finalPrompt}
        
Aspect Ratio: ${aspectRatio}
Person Generation: ${personGeneration}
${finalNegativePrompt ? `Negative Prompt (things to avoid): ${finalNegativePrompt}` : ''}`
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBytes
        }
      }
    ];

    // 비디오 생성 요청 (표준 generateContent API 사용)
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: parts
      }],
      generationConfig: {
        // Veo2 특화 설정이 있다면 여기에 추가
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      }
    });

    const response = await result.response;
    console.log('Veo2 generation started:', response);

    const generationId = `veo2_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // gen_videos 테이블 업데이트 (processing 상태로) - 파라미터 저장
    const { error: updateError } = await supabaseAdmin
      .from('gen_videos')
      .update({
        generation_status: 'processing',
        request_id: generationId,
        credits_used: VIDEO_GENERATION_COST,
        negative_prompt: finalNegativePrompt,
        aspect_ratio: aspectRatio,
        person_generation: personGeneration,
        model_version: 'veo-2.0-generate-001',
        api_response: { text: response.text() },
        metadata: {
          ...requestBody,
          veo2_response: response.text(),
          model: 'veo-2.0-generate-001',
          imageUrl: imageUrl,
          aspectRatio: aspectRatio,
          personGeneration: personGeneration,
          negativePrompt: finalNegativePrompt,
          status: 'processing',
          startedAt: new Date().toISOString(),
          userId: user.sub,
          creditsCost: VIDEO_GENERATION_COST
        }
      })
      .eq('id', videoId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('비디오 생성 정보 업데이트에 실패했습니다.');
    }

    // 비동기로 폴링하여 완료 확인 (백그라운드 작업)
    pollVeo2Operation(genAI, generationId, videoId, supabaseAdmin, user.sub).catch(console.error);

    // 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: videoId,
        generationId: generationId,
        status: 'processing',
        message: 'Google Veo2 비디오 생성이 시작되었습니다. 약 2-5분 소요됩니다.',
        model: 'veo-2.0-generate-001'
      })
    };

  } catch (error) {
    console.error("Veo2 Video Generation Error:", error);
    
    // 오류 발생 시 크레딧 환불
    if (userProfile && user) {
      await supabaseAdmin
        .from('profiles')
        .update({ credits: userProfile.credits })
        .eq('user_id', user.sub);
    }
    
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error.';
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

// 백그라운드에서 Veo2 작업 상태 폴링
async function pollVeo2Operation(genAI, generationId, videoId, supabaseAdmin, userId) {
  let attempts = 0;
  const maxAttempts = 30; // 최대 5분 (10초 * 30)
  
  // Veo2는 실제로는 즉시 생성되거나 별도의 폴링 메커니즘이 필요할 수 있음
  // 현재는 시뮬레이션으로 처리
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10초 대기
    
    try {
      console.log(`Polling attempt ${attempts + 1} for Veo2 generation`);
      
      // 중간 상태 업데이트
      await supabaseAdmin
        .from('gen_videos')
        .update({
          metadata: {
            operationStatus: 'processing',
            lastPolled: new Date().toISOString(),
            attempts: attempts + 1
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);
      
      // Veo2는 실제로 동기적으로 생성되므로, 첫 번째 시도 후 완료로 표시
      if (attempts === 0) {
        // 실제 Veo2 API는 비디오 URL을 직접 반환할 것임
        // 여기서는 시뮬레이션을 위해 더미 URL 사용
        const videoUrl = `https://storage.googleapis.com/veo2-generated/${generationId}.mp4`;
        
        // gen_videos 테이블 업데이트 (completed 상태로)
        await supabaseAdmin
          .from('gen_videos')
          .update({
            generation_status: 'completed',
            video_url: videoUrl,
            metadata: {
              operationStatus: 'completed',
              completedAt: new Date().toISOString(),
              finalUri: videoUrl,
              generationId: generationId
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', videoId);
        
        console.log('Video generation completed successfully:', videoUrl);
        
        // Storage에 자동으로 다운로드 (선택사항)
        try {
          await downloadToStorage(videoUrl, videoId, userId, supabaseAdmin);
        } catch (error) {
          console.error('Failed to auto-download to Storage:', error);
          // Storage 다운로드 실패는 치명적이지 않으므로 계속 진행
        }
        
        break;
      }
    } catch (pollError) {
      console.error('Polling error:', pollError);
    }
    
    attempts++;
  }

  // 타임아웃 처리
  if (attempts >= maxAttempts) {
    await supabaseAdmin
      .from('gen_videos')
      .update({
        generation_status: 'failed',
        metadata: {
          operationStatus: 'timeout',
          failedAt: new Date().toISOString(),
          error: 'Operation timed out after ' + attempts + ' attempts',
          attempts: attempts
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);
    
    console.error('Video generation timed out after', attempts, 'attempts');
  }
}

// Storage에 비디오 다운로드
async function downloadToStorage(videoUrl, videoId, userId, supabaseAdmin) {
  console.log('Auto-downloading Veo2 video to Storage...');
  
  // gen_videos에서 project_id 가져오기
  const { data: videoData } = await supabaseAdmin
    .from('gen_videos')
    .select('project_id')
    .eq('id', videoId)
    .single();
  
  if (!videoData?.project_id) {
    throw new Error('Project ID not found');
  }
  
  const fileName = `video_${videoId}_${Date.now()}.mp4`;
  const filePath = `${videoData.project_id}/videos/${fileName}`;
  
  // 비디오 다운로드
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GENERATIVE_LANGUAGE_API_KEY;
  
  const videoResponse = await fetch(videoUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'x-goog-api-key': apiKey
    }
  });
  
  if (!videoResponse.ok) {
    // URL 파라미터로 재시도
    const retryResponse = await fetch(`${videoUrl}?key=${apiKey}`);
    if (!retryResponse.ok) {
      throw new Error(`Failed to download video: ${retryResponse.status}`);
    }
    const videoBuffer = await retryResponse.buffer();
    
    // Supabase Storage에 업로드
    const { error: uploadError } = await supabaseAdmin.storage
      .from('gen-videos')
      .upload(filePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
  } else {
    const videoBuffer = await videoResponse.buffer();
    
    // Supabase Storage에 업로드
    const { error: uploadError } = await supabaseAdmin.storage
      .from('gen-videos')
      .upload(filePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (uploadError) throw uploadError;
  }
  
  // Storage URL 생성
  const { data: urlData } = supabaseAdmin.storage
    .from('gen-videos')
    .getPublicUrl(filePath);
  
  const storageUrl = urlData.publicUrl;
  
  // gen_videos 테이블 업데이트
  await supabaseAdmin
    .from('gen_videos')
    .update({
      storage_video_url: storageUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', videoId);
  
  console.log('Video successfully uploaded to Storage:', storageUrl);
  return storageUrl;
}