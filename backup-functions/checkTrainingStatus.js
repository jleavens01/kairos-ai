// HeyGen Avatar Group 학습 상태 확인 API
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
    if (!requestData.training_id && !requestData.group_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'training_id or group_id is required' })
      }
    }

    // HeyGen API 호출 - 학습 상태 확인
    let apiUrl
    if (requestData.training_id) {
      apiUrl = `https://api.heygen.com/v2/photo_avatar/training/${requestData.training_id}/status`
      console.log('Checking HeyGen Avatar training status for training ID:', requestData.training_id)
    } else {
      apiUrl = `https://api.heygen.com/v2/photo_avatar/groups/${requestData.group_id}/training/status`
      console.log('Checking HeyGen Avatar training status for group ID:', requestData.group_id)
    }

    const heygenResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Training Status API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Training Status API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Training Status API response:', parseError)
      
      // HTML 응답인 경우 404나 다른 HTTP 오류로 간주
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        return {
          statusCode: heygenResponse.status,
          headers,
          body: JSON.stringify({
            error: `HeyGen API endpoint not found (${heygenResponse.status})`,
            message: 'Training may still be initializing or API endpoint may be incorrect',
            details: `HTTP ${heygenResponse.status}`,
            suggestion: 'Training may still be in progress'
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
      console.error('HeyGen Avatar Training Status API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Training Status API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // HeyGen API 응답 구조에 따라 상태 매핑
    const trainingData = heygenResult.data || heygenResult
    let status = 'training'
    let progress = 50
    let isComplete = false
    let errorMessage = null

    console.log('HeyGen training status response data:', trainingData)

    // HeyGen 학습 상태 매핑
    if (trainingData.status) {
      switch (trainingData.status.toLowerCase()) {
        case 'completed':
        case 'success':
        case 'done':
          status = 'completed'
          progress = 100
          isComplete = true
          break
        case 'training':
        case 'processing':
        case 'in_progress':
        case 'running':
          status = 'training'
          progress = trainingData.progress || Math.min(50 + Math.random() * 30, 90)
          break
        case 'failed':
        case 'error':
          status = 'failed'
          progress = 0
          errorMessage = trainingData.error_message || trainingData.message || 'Training failed'
          break
        case 'pending':
        case 'queued':
          status = 'pending'
          progress = 10
          break
        default:
          status = 'training'
          progress = Math.min(50 + Math.random() * 20, 80)
      }
    }

    // 성공 응답
    const response = {
      success: true,
      training_id: requestData.training_id,
      group_id: requestData.group_id,
      status,
      progress: Math.round(progress),
      is_complete: isComplete,
      error_message: errorMessage,
      estimated_remaining_time: isComplete ? null : trainingData.estimated_remaining_time || 'Unknown',
      next_step: isComplete ? 'Generate avatar looks with /generateAvatarLook' : 'Continue monitoring training status',
      raw_response: trainingData
    }

    console.log('HeyGen avatar training status check successful:', response)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Avatar training status check error:', error)
    
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