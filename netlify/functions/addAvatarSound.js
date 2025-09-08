// HeyGen Avatar 사운드 추가 API
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
    if (!requestData.video_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'video_url is required' })
      }
    }

    // HeyGen Avatar 사운드 추가 페이로드
    const heygenPayload = {
      video_url: requestData.video_url,
      audio_config: {
        type: requestData.audio_type || 'background_music', // background_music, sound_effects, narration
        volume: requestData.volume || 0.5, // 0.0-1.0
        fade_in: requestData.fade_in || 0.5, // seconds
        fade_out: requestData.fade_out || 0.5, // seconds
        start_time: requestData.start_time || 0, // seconds from video start
        loop: requestData.loop || false // 반복 재생 여부
      },
      sound_effects: requestData.sound_effects || [], // array of sound effect objects
      background_music: requestData.background_music ? {
        track_id: requestData.background_music.track_id || 'default',
        genre: requestData.background_music.genre || 'ambient', // ambient, corporate, upbeat, dramatic
        mood: requestData.background_music.mood || 'neutral', // neutral, happy, serious, inspiring
        tempo: requestData.background_music.tempo || 'medium', // slow, medium, fast
        volume: requestData.background_music.volume || 0.3
      } : null,
      narration: requestData.narration ? {
        voice_id: requestData.narration.voice_id || 'default',
        text: requestData.narration.text || '',
        speed: requestData.narration.speed || 1.0,
        pitch: requestData.narration.pitch || 0,
        volume: requestData.narration.volume || 0.8
      } : null,
      output_config: {
        format: requestData.format || 'mp4', // mp4, webm
        quality: requestData.quality || 'high', // standard, high, premium
        audio_quality: requestData.audio_quality || 'high' // standard, high, premium
      },
      callback_id: requestData.callback_id || `avatar_sound_${Date.now()}`
    }

    // HeyGen API 호출 - Avatar 사운드 추가
    console.log('Adding sound to HeyGen Avatar video:', JSON.stringify({
      video_url: heygenPayload.video_url.substring(0, 50) + '...',
      audio_type: heygenPayload.audio_config.type,
      has_background_music: !!heygenPayload.background_music,
      has_narration: !!heygenPayload.narration,
      sound_effects_count: heygenPayload.sound_effects.length,
      callback_id: heygenPayload.callback_id
    }, null, 2))

    const heygenResponse = await fetch('https://api.heygen.com/v2/photo_avatar/sound/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(heygenPayload)
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Sound API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Sound API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Sound API response:', parseError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response format from HeyGen API',
          details: responseText.substring(0, 200)
        })
      }
    }

    if (!heygenResponse.ok) {
      console.error('HeyGen Avatar Sound API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Sound API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    console.log('Avatar sound addition started successfully:', heygenResult)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sound_job_id: heygenResult.data?.sound_job_id || heygenResult.job_id,
        video_url: requestData.video_url,
        message: 'Avatar sound addition started successfully',
        callback_id: heygenPayload.callback_id,
        status: 'processing',
        estimated_time: '2-10 minutes depending on video length and audio complexity',
        next_step: 'Monitor sound processing status with /checkSoundStatus',
        data: heygenResult.data,
        audio_config: heygenPayload.audio_config,
        output_config: heygenPayload.output_config
      })
    }

  } catch (error) {
    console.error('Avatar sound addition error:', error)
    
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