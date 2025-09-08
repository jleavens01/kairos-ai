// FAL AI Veo3 Standard Image-to-Video 모델을 사용한 비디오 생성
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { fal } from '@fal-ai/client';

const VIDEO_GENERATION_COST = 3000; // Veo3 Preview 비용

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

    // FAL API 키 확인
    const falApiKey = process.env.FAL_API_KEY;
    if (!falApiKey) {
      throw new Error('FAL API 키가 설정되지 않았습니다.');
    }

    // FAL 클라이언트 설정
    fal.config({
      credentials: falApiKey
    });

    // 요청 데이터 파싱
    const requestBody = JSON.parse(event.body);
    const { 
      projectId, 
      videoId,  // gen_videos 테이블의 ID
      imageUrl,  // 참조 이미지 (image-to-video)
      prompt,  // 프롬프트
      duration = "8s",  // 비디오 길이 (8s, 15s 지원)
      generateAudio = true,  // 오디오 생성 여부
      resolution = "720p",  // 해상도 (720p, 1080p)
      parameters = {}
    } = requestBody;

    if (!projectId || !videoId || !imageUrl || !prompt) {
      throw new Error('필수 파라미터가 누락되었습니다.');
    }

    console.log('FAL AI Veo3 Standard video generation request:', {
      projectId,
      videoId,
      prompt: prompt.substring(0, 50) + '...',
      imageUrl: imageUrl.substring(0, 50) + '...',
      duration,
      generateAudio,
      resolution
    });

    const generationId = `fal_veo3_${Date.now()}_${Math.random().toString(36).substring(7)}`;


    // gen_videos 테이블 업데이트 (processing 상태로)
    const { error: updateError } = await supabaseAdmin
      .from('gen_videos')
      .update({
        generation_status: 'processing',
        request_id: generationId,
        credits_used: VIDEO_GENERATION_COST,
        model_version: 'fal-ai/veo3/image-to-video',
        metadata: {
          ...requestBody,
          model: 'fal-ai/veo3/image-to-video',
          imageUrl: imageUrl,
          duration: duration,
          generateAudio: generateAudio,
          resolution: resolution,
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

    // FAL AI Veo3 Standard 비디오 생성 요청
    console.log('Requesting video generation with FAL AI Veo3 Standard...');
    
    try {
      const result = await fal.subscribe("fal-ai/veo3/image-to-video", {
        input: {
          prompt: prompt,
          image_url: imageUrl,
          duration: duration,
          generate_audio: generateAudio,
          resolution: resolution
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log('FAL AI progress logs:', update.logs?.map(log => log.message).join(' '));
          }
        },
      });

      console.log('FAL AI Veo3 Standard generation completed:', result.requestId);

      // 성공 시 gen_videos 테이블 업데이트
      const { error: finalUpdateError } = await supabaseAdmin
        .from('gen_videos')
        .update({
          generation_status: 'completed',
          video_url: result.data.video.url,
          api_response: result.data,
          metadata: {
            ...requestBody,
            model: 'fal-ai/veo3/image-to-video',
            falRequestId: result.requestId,
            videoUrl: result.data.video.url,
            completedAt: new Date().toISOString(),
            duration: duration,
            generateAudio: generateAudio,
            resolution: resolution,
            status: 'completed',
            userId: user.sub,
            creditsCost: VIDEO_GENERATION_COST
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (finalUpdateError) {
        console.error('Final update error:', finalUpdateError);
      }

      // 선택적으로 Storage에 비디오 다운로드
      try {
        await downloadToStorage(result.data.video.url, videoId, user.sub, supabaseAdmin, projectId);
      } catch (storageError) {
        console.error('Failed to download to storage:', storageError);
        // Storage 실패는 전체 프로세스를 중단하지 않음
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: videoId,
          generationId: generationId,
          falRequestId: result.requestId,
          status: 'completed',
          videoUrl: result.data.video.url,
          message: 'FAL AI Veo3 Standard 비디오 생성이 완료되었습니다.',
          model: 'fal-ai/veo3/image-to-video'
        })
      };

    } catch (falError) {
      console.error('FAL AI generation error:', falError);
      
      // 실패 시 gen_videos 테이블 업데이트
      await supabaseAdmin
        .from('gen_videos')
        .update({
          generation_status: 'failed',
          api_response: { error: falError.message },
          metadata: {
            ...requestBody,
            model: 'fal-ai/veo3/image-to-video',
            error: falError.message,
            failedAt: new Date().toISOString(),
            status: 'failed',
            userId: user.sub,
            creditsCost: VIDEO_GENERATION_COST
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      throw new Error(`FAL AI 비디오 생성 실패: ${falError.message}`);
    }

  } catch (error) {
    console.error("Veo3 Preview Video Generation Error:", error);
    
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


// Storage에 비디오 다운로드
async function downloadToStorage(videoUrl, videoId, userId, supabaseAdmin, projectId) {
  console.log('Auto-downloading Veo3 Standard video to Storage...');
  
  const fileName = `video_${videoId}_${Date.now()}.mp4`;
  const filePath = `${projectId}/videos/${fileName}`;
  
  // 비디오 다운로드
  const videoResponse = await fetch(videoUrl);
  
  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`);
  }
  
  const videoBuffer = await videoResponse.arrayBuffer();
  
  // Supabase Storage에 업로드
  const { error: uploadError } = await supabaseAdmin.storage
    .from('gen-videos')
    .upload(filePath, videoBuffer, {
      contentType: 'video/mp4',
      upsert: true
    });
  
  if (uploadError) throw uploadError;
  
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