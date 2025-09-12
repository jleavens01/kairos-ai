// TTS 생성 함수 - ElevenLabs API 사용
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// 숫자를 한글로 변환하는 함수 (Gemini 2.0 Flash 사용)
async function convertNumbersToKorean(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not found, 숫자 변환 건너뛰기');
    return text;
  }

  // 숫자가 포함된 텍스트인지 확인
  const hasNumbers = /\d+/.test(text);
  if (!hasNumbers) return text;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `다음 텍스트에서 숫자를 한국어 TTS에 적합하도록 변환해주세요. 

규칙:
1. 연도 (예: 1997년 → 천 구백 구십칠년)
2. 금액 (예: 1023500원 → 백 이만 삼천 오백원)
3. 일반 숫자 (예: 12345 → 만 이천 삼백 사십오)
4. 소수점 (예: 3.14 → 삼점 일사)
5. 퍼센트 (예: 85% → 팔십오 퍼센트)

다른 텍스트는 그대로 유지하고, 숫자 부분만 한글로 변환하세요.

텍스트: "${text}"`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status}`);
    }

    const data = await response.json();
    const convertedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (convertedText && convertedText.trim()) {
      console.log('숫자 변환 완료:', text.substring(0, 50), '→', convertedText.substring(0, 50));
      return convertedText.trim();
    } else {
      console.warn('Gemini 응답이 비어있음');
      return text;
    }
  } catch (error) {
    console.error('Gemini 숫자 변환 오류:', error);
    return text;
  }
}

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  // Node.js 18+ has native fetch support
  // No need to import node-fetch

  let user;
  
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

    // 요청 파싱
    const { 
      projectId, 
      sceneId, 
      text,
      voiceId = "elevenlabs_custom_korean_voice", // 사용자 커스텀 한국어 음성 (실제 voice_id로 업데이트 필요)
      modelId = "eleven_turbo_v2_5", // 최신 모델 사용
      voiceSettings = {
        stability: 0.60,      // 클론 음성 최적화
        similarity_boost: 0.85, // 높은 유사성
        style: 0.10,          // 낮은 스타일 강도 (자연스러움)
        use_speaker_boost: true
      }
    } = JSON.parse(event.body || '{}');

    if (!projectId || !sceneId || !text) {
      throw new Error('projectId, sceneId, and text are required.');
    }

    // 커스텀 음성 ID 가져오기 (한국어 우선)
    let finalVoiceId = voiceId;
    let finalModelId = modelId;
    let finalVoiceSettings = voiceSettings;

    if (voiceId === "elevenlabs_custom_korean_voice") {
      try {
        const { data: customVoice, error: voiceError } = await supabase
          .from('voice_models')
          .select('voice_id, elevenlabs_model, default_similarity_boost, default_stability, default_style')
          .eq('category', 'personal')
          .eq('provider', 'elevenlabs')
          .eq('language', 'ko')
          .eq('is_active', true)
          .single();

        if (!voiceError && customVoice && customVoice.voice_id !== 'elevenlabs_custom_korean_voice') {
          finalVoiceId = customVoice.voice_id;
          finalModelId = customVoice.elevenlabs_model || finalModelId;
          finalVoiceSettings = {
            ...finalVoiceSettings,
            stability: customVoice.default_stability || finalVoiceSettings.stability,
            similarity_boost: customVoice.default_similarity_boost || finalVoiceSettings.similarity_boost,
            style: customVoice.default_style || finalVoiceSettings.style
          };
          console.log(`Using custom voice: ${finalVoiceId} with model: ${finalModelId}`);
        } else {
          console.warn('Custom voice not found or not updated, using fallback');
          finalVoiceId = "W7FnAxJNpD5WGjrF5GLp"; // 기존 기본값으로 폴백
        }
      } catch (error) {
        console.warn('Failed to fetch custom voice:', error.message);
        finalVoiceId = "W7FnAxJNpD5WGjrF5GLp"; // 기존 기본값으로 폴백
      }
    }

    // 텍스트 파싱 처리
    let processedText = text;
    
    // 1. 괄호 안 내용 제거 (지시문, 연출 노트 등)
    processedText = processedText.replace(/\([^)]*\)/g, '');
    processedText = processedText.replace(/\[[^\]]*\]/g, '');
    processedText = processedText.replace(/\{[^}]*\}/g, '');
    
    // 2. 이모지 및 특수 유니코드 문자 제거
    processedText = processedText.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // 이모티콘
    processedText = processedText.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // 기타 기호
    processedText = processedText.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // 교통/지도 기호
    processedText = processedText.replace(/[\u{1F700}-\u{1F77F}]/gu, ''); // 알케미 기호
    processedText = processedText.replace(/[\u{1F780}-\u{1F7FF}]/gu, ''); // 기하학 기호
    processedText = processedText.replace(/[\u{1F800}-\u{1F8FF}]/gu, ''); // 보충 화살표
    processedText = processedText.replace(/[\u{2600}-\u{26FF}]/gu, '');   // 기타 기호
    processedText = processedText.replace(/[\u{2700}-\u{27BF}]/gu, '');   // 딩뱃
    
    // 3. 따옴표 제거 (대화문 표시용 따옴표 모두 제거)
    processedText = processedText.replace(/[""""]/g, ''); // 큰따옴표 제거
    processedText = processedText.replace(/['''']/g, ''); // 작은따옴표 제거
    processedText = processedText.replace(/[「」『』]/g, ''); // 일본어 따옴표 제거
    processedText = processedText.replace(/[《》〈〉]/g, ''); // 중국어 따옴표 제거
    processedText = processedText.replace(/[｢｣]/g, ''); // 반각 따옴표 제거
    processedText = processedText.replace(/[`´]/g, ''); // 백틱과 억음 부호 제거
    
    // 4. 특수 문자 처리
    processedText = processedText.replace(/[<>]/g, ''); // 꺾쇠 괄호 제거
    processedText = processedText.replace(/[♪♫♬♭♮♯]/g, ''); // 음악 기호
    processedText = processedText.replace(/[★☆♥♡]/g, ''); // 별, 하트 등
    processedText = processedText.replace(/[※▶◀■□▲△▼▽○●◎◇◆]/g, ''); // 도형
    
    // 5. 연속된 특수 문자 정리
    processedText = processedText.replace(/[!?]{2,}/g, match => match[0]); // 연속된 느낌표/물음표를 하나로
    processedText = processedText.replace(/\.{3,}/g, '...'); // 연속된 마침표를 ...로
    processedText = processedText.replace(/[~]{2,}/g, '~'); // 연속된 물결표를 하나로
    
    // 6. 숫자 한글 변환 (Gemini 2.0 Flash 사용)
    try {
      processedText = await convertNumbersToKorean(processedText);
    } catch (error) {
      console.warn('숫자 변환 실패, 원본 텍스트 사용:', error.message);
    }

    // 7. 줄바꿈 및 공백 정리
    processedText = processedText.replace(/\n{3,}/g, '\n\n'); // 3개 이상의 줄바꿈을 2개로
    processedText = processedText.replace(/\s+/g, ' '); // 연속된 공백을 하나로
    processedText = processedText.trim(); // 앞뒤 공백 제거
    
    // 8. 빈 텍스트 체크
    if (!processedText || processedText.length === 0) {
      throw new Error('텍스트 처리 후 내용이 없습니다.');
    }
    
    console.log('Original text length:', text.length, 'Processed text length:', processedText.length);

    // Supabase 관리자 클라이언트
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ElevenLabs API 호출
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Server configuration error: API key is missing.");

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}?output_format=mp3_44100_128`;
    const body = JSON.stringify({
      text: processedText, // 파싱된 텍스트 사용
      model_id: finalModelId,
      voice_settings: finalVoiceSettings
    });

    console.log('Calling ElevenLabs API with:', { 
      voiceId: finalVoiceId, 
      modelId: finalModelId, 
      textLength: text.length,
      settings: finalVoiceSettings
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'xi-api-key': apiKey 
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API Error: ${errorText}`);
    }

    // 오디오 데이터 받기
    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer);
    
    // 파일명 생성 (프로젝트ID/씬ID_버전_타임스탬프.mp3)
    const timestamp = Date.now();
    
    // 현재 씬의 최대 버전 번호 찾기
    const { data: existingAudios } = await supabaseAdmin
      .from('tts_audio')
      .select('version')
      .eq('scene_id', sceneId)
      .order('version', { ascending: false })
      .limit(1);
    
    const nextVersion = existingAudios && existingAudios.length > 0 
      ? existingAudios[0].version + 1 
      : 1;
    
    const fileName = `${projectId}/${sceneId}_v${nextVersion}_${timestamp}.mp3`;
    
    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('tts-audio')
      .upload(fileName, audioData, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload audio file.');
    }

    // Storage URL 생성
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('tts-audio')
      .getPublicUrl(fileName);

    // 데이터베이스에 정보 저장
    const { data: ttsRecord, error: dbError } = await supabaseAdmin
      .from('tts_audio')
      .insert({
        project_id: projectId,
        scene_id: sceneId,
        version: nextVersion,
        text: processedText, // 처리된 텍스트 저장
        voice_id: finalVoiceId,
        model_id: finalModelId,
        file_url: publicUrl,
        file_size: audioData.length,
        voice_settings: finalVoiceSettings,
        created_by: user.sub
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Storage에서 파일 삭제 (롤백)
      await supabaseAdmin.storage
        .from('tts-audio')
        .remove([fileName]);
      throw new Error('Failed to save TTS record.');
    }

    console.log('TTS generated successfully:', { 
      sceneId, 
      version: nextVersion, 
      fileSize: audioData.length 
    });

    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          id: ttsRecord.id,
          file_url: publicUrl,
          version: nextVersion,
          text: text,
          created_at: ttsRecord.created_at
        }
      })
    };

  } catch (error) {
    console.error('Error in generateTTS function:', error.message || error);
    
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