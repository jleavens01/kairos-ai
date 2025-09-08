// HeyGen Avatar Group 생성 API
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
    if (!requestData.name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Avatar group name is required' })
      }
    }

    if (!requestData.photos || !Array.isArray(requestData.photos) || requestData.photos.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one photo is required' })
      }
    }

    // HeyGen Avatar Group 생성 페이로드
    const heygenPayload = {
      name: requestData.name,
      description: requestData.description || 'Custom Avatar Group created by Kairos AI',
      photos: requestData.photos.map(photo => ({
        photo_data: photo.photo_data,
        photo_url: photo.photo_url
      })),
      callback_id: requestData.callback_id || `avatar_group_${Date.now()}`
    }

    // HeyGen API 호출 - Avatar Group 생성
    console.log('Creating HeyGen Avatar Group:', JSON.stringify({
      name: heygenPayload.name,
      photoCount: heygenPayload.photos.length,
      callback_id: heygenPayload.callback_id
    }, null, 2))

    const heygenResponse = await fetch('https://api.heygen.com/v2/photo_avatar/groups', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(heygenPayload)
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen Avatar Group API response status:', heygenResponse.status)
    console.log('HeyGen Avatar Group API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen Avatar Group API response:', parseError)
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
      console.error('HeyGen Avatar Group API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen Avatar Group API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    console.log('Avatar Group creation successful:', heygenResult)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        group_id: heygenResult.data?.group_id || heygenResult.group_id,
        message: 'Avatar Group created successfully',
        callback_id: heygenPayload.callback_id,
        status: 'created',
        next_step: 'Train the avatar group with /trainAvatarGroup',
        data: heygenResult.data,
        request_params: {
          name: heygenPayload.name,
          photo_count: heygenPayload.photos.length
        }
      })
    }

  } catch (error) {
    console.error('Avatar Group creation error:', error)
    
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