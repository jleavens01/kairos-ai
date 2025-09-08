// HeyGen Avatar 모션 추가 API
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
    if (!requestData.look_url || !requestData.motion_type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'look_url and motion_type are required' })
      }
    }

    // HeyGen Avatar 모션 추가 페이로드
    const heygenPayload = {
      look_url: requestData.look_url,
      motion_config: {
        type: requestData.motion_type, // speaking, nodding, gesturing, blinking, breathing
        intensity: requestData.intensity || 'medium', // low, medium, high
        duration: requestData.duration || 10, // seconds (1-30)
        speed: requestData.speed || 1.0, // 0.5-2.0 배속
        loop: requestData.loop || false, // 반복 재생 여부
        transition: requestData.transition || 'smooth' // smooth, quick, natural
      },
      voice_config: requestData.voice_config || {
        voice_id: requestData.voice_id || 'default',
        text: requestData.text || '',
        speed: requestData.voice_speed || 1.0,
        pitch: requestData.voice_pitch || 0
      },
      output_config: {
        format: requestData.format || 'mp4', // mp4, webm, gif
        quality: requestData.quality || 'high', // standard, high, premium
        resolution: requestData.resolution || '1080p', // 720p, 1080p, 4k
        fps: requestData.fps || 30, // 24, 30, 60
        background: requestData.background || 'transparent' // transparent, white, green, custom
      },
      callback_id: requestData.callback_id || `avatar_motion_${Date.now()}`
    }

    // HeyGen API 호출 - Avatar 모션 추가
    console.log('Adding motion to HeyGen Avatar:', JSON.stringify({
      look_url: heygenPayload.look_url.substring(0, 50) + '...',
      motion_type: heygenPayload.motion_config.type,
      duration: heygenPayload.motion_config.duration,
      quality: heygenPayload.output_config.quality,
      callback_id: heygenPayload.callback_id
    }, null, 2))

    const heygenResponse = await fetch('https://api.heygen.com/v2/photo_avatar/motion/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(heygenPayload)
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Motion API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Motion API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Motion API response:', parseError)
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
      console.error('HeyGen Avatar Motion API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Motion API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    console.log('Avatar motion addition started successfully:', heygenResult)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        motion_job_id: heygenResult.data?.motion_job_id || heygenResult.job_id,
        look_url: requestData.look_url,
        message: 'Avatar motion addition started successfully',
        callback_id: heygenPayload.callback_id,
        status: 'processing',
        estimated_time: `${heygenPayload.motion_config.duration * 2}-${heygenPayload.motion_config.duration * 4} minutes for ${heygenPayload.output_config.quality} quality`,
        next_step: 'Monitor motion processing status with /checkMotionStatus',
        data: heygenResult.data,
        motion_config: heygenPayload.motion_config,
        output_config: heygenPayload.output_config
      })
    }

  } catch (error) {
    console.error('Avatar motion addition error:', error)
    
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