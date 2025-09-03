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

    if (!firstInput.character.avatar_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Avatar ID is required' })
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
      video_inputs: requestData.video_inputs.map(input => ({
        character: {
          type: input.character.type || 'avatar',
          avatar_id: input.character.avatar_id,
          scale: input.character.scale || 1.0,
          avatar_style: input.character.avatar_style || 'normal',
          offset: input.character.offset || { x: 0.0, y: 0.0 }
        },
        voice: {
          type: input.voice.type || 'text',
          voice_id: input.voice.voice_id,
          input_text: input.voice.input_text,
          speed: input.voice.speed || 1.0,
          pitch: input.voice.pitch || 0
        },
        background: input.background || {
          type: 'color',
          value: '#f6f6fc'
        }
      })),
      callback_id: requestData.callback_id || `avatar_${Date.now()}`
    }

    // HeyGen API 호출
    console.log('Calling HeyGen API with payload:', JSON.stringify(heygenPayload, null, 2))

    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
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

    // 성공 응답
    console.log('Avatar video generation successful:', heygenResult)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        video_id: heygenResult.video_id,
        message: 'Avatar video generation started successfully',
        callback_id: heygenPayload.callback_id
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