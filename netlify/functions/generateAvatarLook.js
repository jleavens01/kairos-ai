// HeyGen Avatar Look 생성 API
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
    if (!requestData.group_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Avatar group_id is required' })
      }
    }

    // HeyGen Avatar Look 생성 페이로드
    const heygenPayload = {
      group_id: requestData.group_id,
      look_config: {
        style: requestData.style || 'professional', // professional, casual, artistic, vintage
        angle: requestData.angle || 'front', // front, side, three_quarter
        expression: requestData.expression || 'neutral', // neutral, smile, serious, friendly
        lighting: requestData.lighting || 'natural', // natural, studio, dramatic, soft
        background: requestData.background || 'white', // white, transparent, custom
        quality: requestData.quality || 'high' // standard, high, premium
      },
      generation_count: requestData.generation_count || 4, // 1-10 looks 생성 개수
      callback_id: requestData.callback_id || `avatar_look_${Date.now()}`
    }

    // HeyGen API 호출 - Avatar Look 생성
    console.log('Generating HeyGen Avatar Looks:', JSON.stringify({
      group_id: heygenPayload.group_id,
      style: heygenPayload.look_config.style,
      count: heygenPayload.generation_count,
      callback_id: heygenPayload.callback_id
    }, null, 2))

    const heygenResponse = await fetch(`https://api.heygen.com/v2/photo_avatar/groups/${requestData.group_id}/looks/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(heygenPayload)
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Look Generation API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Look Generation API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Look Generation API response:', parseError)
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
      console.error('HeyGen Avatar Look Generation API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Look Generation API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    console.log('Avatar Look generation started successfully:', heygenResult)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        look_generation_id: heygenResult.data?.look_generation_id || heygenResult.look_generation_id,
        group_id: requestData.group_id,
        message: 'Avatar Look generation started successfully',
        callback_id: heygenPayload.callback_id,
        status: 'generating',
        estimated_time: '5-15 minutes depending on quality and count',
        next_step: 'Monitor look generation status with /checkLookGenerationStatus',
        data: heygenResult.data,
        look_config: heygenPayload.look_config,
        generation_count: heygenPayload.generation_count
      })
    }

  } catch (error) {
    console.error('Avatar Look generation error:', error)
    
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