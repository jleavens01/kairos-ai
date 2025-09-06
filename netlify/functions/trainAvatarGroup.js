// HeyGen Avatar Group 학습 API
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

    // HeyGen Avatar Group 학습 페이로드
    const heygenPayload = {
      group_id: requestData.group_id,
      training_config: {
        quality: requestData.quality || 'standard', // standard, high, premium
        style: requestData.style || 'realistic', // realistic, cartoon, artistic
        training_steps: requestData.training_steps || 1000,
        learning_rate: requestData.learning_rate || 0.0001
      },
      callback_id: requestData.callback_id || `avatar_training_${Date.now()}`
    }

    // HeyGen API 호출 - Avatar Group 학습 시작
    console.log('Starting HeyGen Avatar Group training:', JSON.stringify({
      group_id: heygenPayload.group_id,
      quality: heygenPayload.training_config.quality,
      callback_id: heygenPayload.callback_id
    }, null, 2))

    const heygenResponse = await fetch(`https://api.heygen.com/v2/photo_avatar/groups/${requestData.group_id}/train`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(heygenPayload)
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Training API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Training API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Training API response:', parseError)
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
      console.error('HeyGen Avatar Training API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Training API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    console.log('Avatar Group training started successfully:', heygenResult)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        training_id: heygenResult.data?.training_id || heygenResult.training_id,
        group_id: requestData.group_id,
        message: 'Avatar Group training started successfully',
        callback_id: heygenPayload.callback_id,
        status: 'training',
        estimated_time: '10-30 minutes depending on quality settings',
        next_step: 'Monitor training status with /checkTrainingStatus',
        data: heygenResult.data,
        training_config: heygenPayload.training_config
      })
    }

  } catch (error) {
    console.error('Avatar Group training error:', error)
    
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