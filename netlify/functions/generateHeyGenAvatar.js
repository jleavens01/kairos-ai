// 보이스 설정 구성 함수
const buildVoiceSettings = (voiceInput, voiceModel = null) => {
  const baseSettings = {
    type: voiceInput.type || 'text',
    voice_id: voiceInput.voice_id,
    input_text: voiceInput.input_text
  }

  // 텍스트 음성 설정
  if (baseSettings.type === 'text') {
    // 기본 설정
    if (voiceInput.speed !== undefined) {
      baseSettings.speed = Math.max(0.5, Math.min(1.5, voiceInput.speed))
    }
    
    if (voiceInput.pitch !== undefined) {
      baseSettings.pitch = Math.max(-50, Math.min(50, voiceInput.pitch))
    }
    
    // 감정 설정 (지원하는 경우)
    if (voiceInput.emotion && voiceModel?.supports_emotion) {
      const supportedEmotions = ['Excited', 'Friendly', 'Serious', 'Soothing', 'Broadcaster']
      if (supportedEmotions.includes(voiceInput.emotion)) {
        baseSettings.emotion = voiceInput.emotion
      }
    }
    
    // 로케일 설정 (지원하는 경우)
    if (voiceInput.locale && voiceModel?.supports_multilingual) {
      baseSettings.locale = voiceInput.locale
    }
    
    // ElevenLabs 설정
    if (voiceModel?.provider === 'elevenlabs' && voiceInput.elevenlabs_settings) {
      const elevenSettings = voiceInput.elevenlabs_settings
      
      baseSettings.elevenlabs_settings = {
        model: elevenSettings.model || voiceModel.elevenlabs_model || 'eleven_turbo_v2_5',
        similarity_boost: elevenSettings.similarity_boost !== undefined ? 
          Math.max(0, Math.min(1, elevenSettings.similarity_boost)) : 
          voiceModel.default_similarity_boost,
        stability: elevenSettings.stability !== undefined ? 
          Math.max(0, Math.min(1, elevenSettings.stability)) : 
          voiceModel.default_stability,
        style: elevenSettings.style !== undefined ? 
          Math.max(0, Math.min(1, elevenSettings.style)) : 
          voiceModel.default_style
      }
    }
  }
  
  // 오디오 음성 설정
  else if (baseSettings.type === 'audio') {
    if (voiceInput.audio_url) {
      baseSettings.audio_url = voiceInput.audio_url
    } else if (voiceInput.audio_asset_id) {
      baseSettings.audio_asset_id = voiceInput.audio_asset_id
    }
  }
  
  // 침묵 설정
  else if (baseSettings.type === 'silence') {
    baseSettings.duration = voiceInput.duration ? 
      Math.max(1.0, Math.min(100.0, voiceInput.duration)) : 1.0
  }

  return baseSettings
}

// Supabase 클라이언트 import 추가
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    // HeyGen API 키 확인
    const heygenApiKey = process.env.HEYGEN_API_KEY
    if (!heygenApiKey) {
      console.error('HEYGEN_API_KEY is not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'HeyGen API key is not configured' })
      }
    }

    // 요청 데이터 파싱
    let requestData
    try {
      requestData = JSON.parse(event.body)
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      }
    }

    // 필수 필드 검증
    if (!requestData.video_inputs || !Array.isArray(requestData.video_inputs) || requestData.video_inputs.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'video_inputs is required and must be a non-empty array' })
      }
    }

    // 첫 번째 비디오 입력 검증
    const firstInput = requestData.video_inputs[0]
    if (!firstInput.character || !firstInput.voice) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Each video input must have character and voice settings' })
      }
    }

    // Photo Avatar인지 확인
    const isPhotoAvatar = firstInput.character.type === 'talking_photo'
    const avatarId = isPhotoAvatar ? firstInput.character.talking_photo_id : firstInput.character.avatar_id
    
    if (!avatarId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `${isPhotoAvatar ? 'Talking Photo ID' : 'Avatar ID'} is required` })
      }
    }

    if (!firstInput.voice.voice_id || !firstInput.voice.input_text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Voice ID and input text are required' })
      }
    }

    // HeyGen API 페이로드 구성
    const heygenPayload = {
      title: requestData.title || 'Avatar Video',
      caption: requestData.caption || false,
      dimension: requestData.dimension || { width: 1280, height: 720 },
      video_inputs: requestData.video_inputs.map(input => {
        // Photo Avatar의 경우 talking_photo 타입 사용
        const isPhotoAvatar = input.character.is_photo_avatar || 
                             input.character.type === 'talking_photo' ||
                             input.character.avatar_type === 'photo_avatar_group'


        if (isPhotoAvatar) {
          return {
            character: {
              type: 'talking_photo',
              talking_photo_id: input.character.talking_photo_id || input.character.avatar_id,
              scale: input.character.scale || 1.0,
              talking_photo_style: input.character.talking_photo_style || 'square',
              offset: input.character.offset || { x: 0.0, y: 0.0 },
              talking_style: input.character.talking_style || 'stable',
              expression: input.character.expression || 'default',
              super_resolution: input.character.super_resolution || false,
              matting: input.character.matting || false
            },
            voice: buildVoiceSettings(input.voice, input.voice_model),
            background: input.background || {
              type: 'color',
              value: '#f6f6fc'
            }
          }
        } else {
          // 일반 아바타의 경우 기존 방식 사용
          return {
            character: {
              type: 'avatar',
              avatar_id: input.character.avatar_id,
              scale: input.character.scale || 1.0,
              avatar_style: input.character.avatar_style || 'normal',
              offset: input.character.offset || { x: 0.0, y: 0.0 },
              matting: input.character.matting || false,
              circle_background_color: input.character.circle_background_color
            },
            voice: buildVoiceSettings(input.voice, input.voice_model),
            background: input.background || {
              type: 'color',
              value: '#f6f6fc'
            }
          }
        }
      }),
      callback_id: requestData.callback_id || `avatar_${Date.now()}`
    }

    // HeyGen API 호출
    console.log('Calling HeyGen API with payload:', JSON.stringify(heygenPayload, null, 2))

    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'x-api-key': heygenApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(heygenPayload)
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen API response status:', heygenResponse.status)
    console.log('HeyGen API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen API response:', parseError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response format from HeyGen API',
          details: responseText
        })
      }
    }

    if (!heygenResponse.ok) {
      console.error('HeyGen API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답 - 데이터베이스에 저장
    console.log('Avatar video generation successful:', heygenResult)
    
    // 데이터베이스에 저장할 데이터 구성
    const videoData = {
      user_id: requestData.user_id, // 요청에서 user_id를 받아야 함
      project_id: requestData.project_id, // 프로젝트 ID 추가
      heygen_video_id: heygenResult.video_id,
      callback_id: heygenPayload.callback_id,
      
      // 아바타 설정
      avatar_id: firstInput.character.avatar_id,
      avatar_style: firstInput.character.avatar_style || 'normal',
      avatar_scale: firstInput.character.scale || 1.0,
      
      // 음성 설정
      voice_id: firstInput.voice.voice_id,
      voice_type: firstInput.voice.type || 'text',
      input_text: firstInput.voice.input_text,
      voice_speed: firstInput.voice.speed || 1.0,
      voice_pitch: firstInput.voice.pitch || 0,
      voice_emotion: firstInput.voice.emotion,
      voice_locale: firstInput.voice.locale,
      
      // 비디오 설정
      title: requestData.title || 'Avatar Video',
      dimension_width: requestData.dimension?.width || 1280,
      dimension_height: requestData.dimension?.height || 720,
      has_caption: requestData.caption || false,
      
      // 배경 설정
      background_type: firstInput.background?.type || 'color',
      background_value: firstInput.background?.value || '#f6f6fc',
      
      // 초기 상태
      status: 'processing',
      progress: 0,
      
      // 메타데이터
      generation_params: heygenPayload
    }

    // 데이터베이스에 저장 (user_id가 있는 경우만)
    let dbResult = null
    if (requestData.user_id) {
      try {
        const { data, error } = await supabase
          .from('gen_heygen_videos')
          .insert([videoData])
          .select()
          .single()

        if (error) {
          console.error('Database save error (non-fatal):', error)
        } else {
          dbResult = data
          console.log('HeyGen video saved to database:', data.id)
        }
      } catch (dbError) {
        console.error('Database save error (non-fatal):', dbError)
        // DB 저장 실패해도 API 응답은 성공으로 처리
      }
    } else {
      console.log('No user_id provided, skipping database save')
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        video_id: heygenResult.video_id,
        message: 'Avatar video generation started successfully',
        callback_id: heygenPayload.callback_id,
        database_id: dbResult?.id || null,
        saved_to_db: !!dbResult
      })
    }

  } catch (error) {
    console.error('Avatar video generation error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}