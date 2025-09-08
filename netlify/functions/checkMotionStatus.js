// HeyGen Avatar 모션 처리 상태 확인 API
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
    if (!requestData.motion_job_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'motion_job_id is required' })
      }
    }

    // HeyGen API 호출 - 모션 처리 상태 확인
    console.log('Checking HeyGen Avatar Motion status for job ID:', requestData.motion_job_id)

    const heygenResponse = await fetch(`https://api.heygen.com/v2/photo_avatar/motion/status/${requestData.motion_job_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Motion Status API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Motion Status API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Motion Status API response:', parseError)
      
      // HTML 응답인 경우 404나 다른 HTTP 오류로 간주
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        return {
          statusCode: heygenResponse.status,
          headers,
          body: JSON.stringify({
            error: `HeyGen API endpoint not found (${heygenResponse.status})`,
            message: 'Motion processing may still be initializing or API endpoint may be incorrect',
            details: `HTTP ${heygenResponse.status}`,
            suggestion: 'Motion processing may still be in progress'
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
      console.error('HeyGen Avatar Motion Status API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Motion Status API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // HeyGen API 응답 구조에 따라 상태 매핑
    const motionData = heygenResult.data || heygenResult
    let status = 'processing'
    let progress = 50
    let isComplete = false
    let errorMessage = null
    let videoUrl = null
    let thumbnailUrl = null

    console.log('HeyGen motion status response data:', motionData)

    // HeyGen 모션 처리 상태 매핑
    if (motionData.status) {
      switch (motionData.status.toLowerCase()) {
        case 'completed':
        case 'success':
        case 'done':
          status = 'completed'
          progress = 100
          isComplete = true
          videoUrl = motionData.video_url || motionData.result_url || motionData.output_url
          thumbnailUrl = motionData.thumbnail_url || motionData.preview_url
          break
        case 'processing':
        case 'rendering':
        case 'in_progress':
        case 'running':
          status = 'processing'
          progress = motionData.progress || Math.min(50 + Math.random() * 30, 90)
          break
        case 'failed':
        case 'error':
          status = 'failed'
          progress = 0
          errorMessage = motionData.error_message || motionData.message || 'Motion processing failed'
          break
        case 'pending':
        case 'queued':
          status = 'pending'
          progress = 10
          break
        default:
          status = 'processing'
          progress = Math.min(50 + Math.random() * 20, 80)
      }
    }

    // 성공 응답
    const response = {
      success: true,
      motion_job_id: requestData.motion_job_id,
      status,
      progress: Math.round(progress),
      is_complete: isComplete,
      error_message: errorMessage,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration: motionData.duration || null,
      file_size: motionData.file_size || null,
      resolution: motionData.resolution || null,
      estimated_remaining_time: isComplete ? null : motionData.estimated_remaining_time || 'Unknown',
      next_step: isComplete ? 'Optionally add sound effects with /addAvatarSound or use the video directly' : 'Continue monitoring motion processing status',
      raw_response: motionData
    }

    console.log('HeyGen avatar motion status check successful:', response)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Avatar motion status check error:', error)
    
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