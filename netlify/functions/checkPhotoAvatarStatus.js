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
    if (!requestData.job_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'job_id is required' })
      }
    }

    // HeyGen API 호출 - 사진 아바타 생성 상태 확인
    console.log('Checking HeyGen photo avatar status for job ID:', requestData.job_id)

    const heygenResponse = await fetch(`https://api.heygen.com/v2/photo_avatar/photo/status/${requestData.job_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen photo avatar status API response status:', heygenResponse.status)
    console.log('HeyGen photo avatar status API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen photo avatar status API response:', parseError)
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
      console.error('HeyGen photo avatar status API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen photo avatar status API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // HeyGen API 응답 구조에 따라 상태 매핑
    const jobData = heygenResult.data || heygenResult
    let status = 'processing'
    let photoUrls = []
    let errorMessage = null

    // HeyGen 상태 매핑
    if (jobData.status) {
      switch (jobData.status.toLowerCase()) {
        case 'completed':
        case 'success':
          status = 'completed'
          photoUrls = jobData.photo_urls || jobData.photos || []
          break
        case 'processing':
        case 'pending':
        case 'in_progress':
          status = 'processing'
          break
        case 'failed':
        case 'error':
          status = 'failed'
          errorMessage = jobData.error_message || jobData.message || 'Photo avatar generation failed'
          break
        default:
          status = 'processing'
      }
    }

    // 성공 응답
    const response = {
      success: true,
      job_id: requestData.job_id,
      status,
      photo_urls: photoUrls,
      error_message: errorMessage,
      progress: jobData.progress || null,
      estimated_completion: jobData.estimated_completion || null,
      raw_response: jobData
    }

    console.log('HeyGen photo avatar status check successful:', response)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('HeyGen photo avatar status check error:', error)
    
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