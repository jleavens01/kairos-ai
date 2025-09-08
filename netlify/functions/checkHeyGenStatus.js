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
    if (!requestData.video_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'video_id is required' })
      }
    }

    // HeyGen API 호출 - 비디오 상태 확인
    console.log('Checking HeyGen video status for ID:', requestData.video_id)

    const heygenResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${requestData.video_id}`, {
      method: 'GET',
      headers: {
        'x-api-key': heygenApiKey,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen status API response status:', heygenResponse.status)
    console.log('HeyGen status API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen status API response:', parseError)
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
      console.error('HeyGen status API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen status API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // HeyGen API 응답 구조에 따라 상태 매핑
    const videoData = heygenResult.data || heygenResult
    let status = 'processing'
    let videoUrl = null
    let thumbnailUrl = null
    let duration = null
    let errorMessage = null

    // HeyGen 상태 매핑
    if (videoData.status) {
      switch (videoData.status.toLowerCase()) {
        case 'completed':
        case 'success':
          status = 'completed'
          videoUrl = videoData.video_url || videoData.video_url_get || videoData.url
          thumbnailUrl = videoData.thumbnail_url || videoData.thumbnail
          duration = videoData.duration
          break
        case 'processing':
        case 'pending':
        case 'in_progress':
          status = 'processing'
          break
        case 'failed':
        case 'error':
          status = 'failed'
          errorMessage = videoData.error_message || videoData.message || 'Video generation failed'
          break
        default:
          status = 'processing'
      }
    }

    // 성공 응답
    const response = {
      success: true,
      video_id: requestData.video_id,
      status,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration,
      error_message: errorMessage,
      raw_response: videoData
    }

    console.log('HeyGen status check successful:', response)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('HeyGen status check error:', error)
    
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