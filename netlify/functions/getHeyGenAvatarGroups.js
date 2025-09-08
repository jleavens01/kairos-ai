export const handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
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

    // 쿼리 파라미터 가져오기
    const includePublic = event.queryStringParameters?.include_public === 'true'

    // HeyGen API 호출 - Avatar Group 목록 가져오기
    console.log('Fetching HeyGen avatar groups, include_public:', includePublic)

    const heygenResponse = await fetch(`https://api.heygen.com/v2/avatar_group.list?include_public=${includePublic}`, {
      method: 'GET',
      headers: {
        'x-api-key': heygenApiKey,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen avatar groups API response status:', heygenResponse.status)
    console.log('HeyGen avatar groups API response:', responseText.substring(0, 500))

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen avatar groups API response:', parseError)
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
      console.error('HeyGen avatar groups API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen avatar groups API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    const data = heygenResult.data || {}
    const avatarGroups = data.avatar_group_list || []
    
    const response = {
      success: true,
      total_count: data.total_count || 0,
      avatar_groups: avatarGroups.map(group => ({
        id: group.id,
        name: group.name,
        created_at: group.created_at,
        num_looks: group.num_looks,
        preview_image: group.preview_image,
        group_type: group.group_type,
        train_status: group.train_status,
        default_voice_id: group.default_voice_id,
        is_ready: group.train_status === 'ready'
      }))
    }

    console.log(`Successfully fetched ${avatarGroups.length} avatar groups`)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Get HeyGen avatar groups error:', error)
    
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