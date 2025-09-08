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

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
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

    // GET 요청인 경우 Avatar Group ID에서 Avatar 목록 가져오기
    if (event.httpMethod === 'GET') {
      const avatarGroupId = event.queryStringParameters?.avatar_group_id
      if (!avatarGroupId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'avatar_group_id parameter is required for GET requests' })
        }
      }

      console.log('Fetching avatar group details for ID:', avatarGroupId)

      const response = await fetch(`https://api.heygen.com/v2/avatars/${avatarGroupId}`, {
        method: 'GET',
        headers: {
          'x-api-key': heygenApiKey,
          'Accept': 'application/json'
        }
      })

      const responseText = await response.text()
      console.log('HeyGen API response status:', response.status)
      console.log('HeyGen API response text:', responseText.substring(0, 500))

      if (!response.ok) {
        console.error('HeyGen API error for avatar group:', avatarGroupId)
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({
            error: 'Failed to fetch avatar group details',
            details: responseText,
            avatar_group_id: avatarGroupId
          })
        }
      }

      let result
      try {
        result = JSON.parse(responseText)
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

      // Avatar Group 정보에서 Avatar ID 리스트 추출
      const avatarGroup = result.data || result
      
      // Avatar Group에서 사용 가능한 Avatar ID 목록 반환
      let firstAvatarId = null
      let avatarList = []

      if (avatarGroup.avatar_list && Array.isArray(avatarGroup.avatar_list)) {
        avatarList = avatarGroup.avatar_list
        firstAvatarId = avatarList.length > 0 ? avatarList[0].avatar_id : null
      } else if (avatarGroup.avatars && Array.isArray(avatarGroup.avatars)) {
        avatarList = avatarGroup.avatars
        firstAvatarId = avatarList.length > 0 ? avatarList[0].avatar_id : null
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          avatar_group_id: avatarGroupId,
          avatar_group: avatarGroup,
          avatar_list: avatarList,
          first_avatar_id: firstAvatarId,
          total_avatars: avatarList.length
        })
      }
    }

    // POST 요청인 경우 기존 로직 (개별 Avatar 상세 정보)
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

    // avatar_id 확인
    if (!requestData.avatar_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'avatar_id is required' })
      }
    }

    // HeyGen API 호출 - 아바타 상세 정보 가져오기
    console.log('Fetching HeyGen avatar details for:', requestData.avatar_id)

    const heygenResponse = await fetch(`https://api.heygen.com/v2/avatar/${requestData.avatar_id}/details`, {
      method: 'GET',
      headers: {
        'x-api-key': heygenApiKey,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen avatar details API response status:', heygenResponse.status)
    console.log('HeyGen avatar details API response:', responseText.substring(0, 500))

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen avatar details API response:', parseError)
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
      console.error('HeyGen avatar details API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen avatar details API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    const avatarData = heygenResult.data || heygenResult
    const response = {
      success: true,
      avatar: {
        id: avatarData.id,
        name: avatarData.name,
        gender: avatarData.gender,
        preview_image_url: avatarData.preview_image_url,
        preview_video_url: avatarData.preview_video_url,
        premium: avatarData.premium,
        is_public: avatarData.is_public,
        default_voice_id: avatarData.default_voice_id,
        tags: avatarData.tags || []
      }
    }

    console.log('Successfully fetched avatar details:', requestData.avatar_id)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Get HeyGen avatar details error:', error)
    
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