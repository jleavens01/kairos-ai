// HeyGen Avatar Look 생성 상태 확인 API
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
    if (!requestData.look_generation_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'look_generation_id is required' })
      }
    }

    // HeyGen API 호출 - Look 생성 상태 확인
    console.log('Checking HeyGen Avatar Look generation status for ID:', requestData.look_generation_id)

    const heygenResponse = await fetch(`https://api.heygen.com/v2/photo_avatar/looks/status/${requestData.look_generation_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Look Status API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Look Status API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Look Status API response:', parseError)
      
      // HTML 응답인 경우 404나 다른 HTTP 오류로 간주
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        return {
          statusCode: heygenResponse.status,
          headers,
          body: JSON.stringify({
            error: `HeyGen API endpoint not found (${heygenResponse.status})`,
            message: 'Look generation may still be initializing or API endpoint may be incorrect',
            details: `HTTP ${heygenResponse.status}`,
            suggestion: 'Look generation may still be in progress'
          })
        }
      }
      
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
      console.error('HeyGen Avatar Look Status API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Look Status API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // HeyGen API 응답 구조에 따라 상태 매핑
    const lookData = heygenResult.data || heygenResult
    let status = 'generating'
    let progress = 50
    let isComplete = false
    let errorMessage = null
    let lookUrls = []

    console.log('HeyGen look generation status response data:', lookData)

    // HeyGen Look 생성 상태 매핑
    if (lookData.status) {
      switch (lookData.status.toLowerCase()) {
        case 'completed':
        case 'success':
        case 'done':
          status = 'completed'
          progress = 100
          isComplete = true
          lookUrls = lookData.look_urls || lookData.looks || lookData.result_urls || []
          break
        case 'generating':
        case 'processing':
        case 'in_progress':
        case 'running':
          status = 'generating'
          progress = lookData.progress || Math.min(50 + Math.random() * 30, 90)
          break
        case 'failed':
        case 'error':
          status = 'failed'
          progress = 0
          errorMessage = lookData.error_message || lookData.message || 'Look generation failed'
          break
        case 'pending':
        case 'queued':
          status = 'pending'
          progress = 10
          break
        default:
          status = 'generating'
          progress = Math.min(50 + Math.random() * 20, 80)
      }
    }

    // 성공 응답
    const response = {
      success: true,
      look_generation_id: requestData.look_generation_id,
      status,
      progress: Math.round(progress),
      is_complete: isComplete,
      error_message: errorMessage,
      look_urls: lookUrls,
      look_count: lookUrls.length,
      estimated_remaining_time: isComplete ? null : lookData.estimated_remaining_time || 'Unknown',
      next_step: isComplete ? 'Select preferred look and add motion with /addAvatarMotion' : 'Continue monitoring look generation status',
      raw_response: lookData
    }

    console.log('HeyGen avatar look generation status check successful:', response)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Avatar look generation status check error:', error)
    
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