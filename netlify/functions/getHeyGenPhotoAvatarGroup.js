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

    // group_id 확인
    if (!requestData.group_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'group_id is required' })
      }
    }

    // HeyGen API 호출 - Photo Avatar Group의 모든 아바타 가져오기
    console.log('Fetching HeyGen photo avatar group:', requestData.group_id)

    const heygenResponse = await fetch(`https://api.heygen.com/v2/avatars/avatar_group/${requestData.group_id}`, {
      method: 'GET',
      headers: {
        'x-api-key': heygenApiKey,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen photo avatar group API response status:', heygenResponse.status)
    console.log('HeyGen photo avatar group API response:', responseText.substring(0, 500))

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen photo avatar group API response:', parseError)
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
      console.error('HeyGen photo avatar group API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen photo avatar group API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    const avatarList = heygenResult.data?.talking_photo_list || []
    const response = {
      success: true,
      group_id: requestData.group_id,
      avatars: avatarList.map(avatar => ({
        id: avatar.id,
        name: avatar.name || 'Look ' + (avatarList.indexOf(avatar) + 1),
        preview_image_url: avatar.preview_image_url,
        is_public: avatar.is_public
      })),
      total: avatarList.length
    }

    console.log(`Successfully fetched ${avatarList.length} avatars in group:`, requestData.group_id)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Get HeyGen photo avatar group error:', error)
    
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