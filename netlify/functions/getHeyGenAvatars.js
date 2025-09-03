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

    // HeyGen API 호출 - 아바타 목록 가져오기
    console.log('Fetching HeyGen avatars list')

    const heygenResponse = await fetch('https://api.heygen.com/v2/avatars', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen avatars API response status:', heygenResponse.status)
    console.log('HeyGen avatars API response text:', responseText.substring(0, 500))

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen avatars API response:', parseError)
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
      console.error('HeyGen avatars API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen avatars API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 아바타 데이터 정리 및 변환
    const avatars = heygenResult.avatars || []
    const talkingPhotos = heygenResult.talking_photos || []

    const processedAvatars = avatars.map(avatar => ({
      id: avatar.avatar_id,
      name: avatar.avatar_name,
      gender: avatar.gender,
      thumbnail: avatar.preview_image_url,
      previewVideo: avatar.preview_video_url,
      premium: avatar.premium || false,
      type: 'avatar'
    }))

    const processedTalkingPhotos = talkingPhotos.map(photo => ({
      id: photo.talking_photo_id,
      name: photo.talking_photo_name,
      thumbnail: photo.preview_image_url,
      type: 'talking_photo'
    }))

    // 성공 응답
    const response = {
      success: true,
      avatars: processedAvatars,
      talking_photos: processedTalkingPhotos,
      total_avatars: processedAvatars.length,
      total_talking_photos: processedTalkingPhotos.length
    }

    console.log(`Successfully fetched ${processedAvatars.length} avatars and ${processedTalkingPhotos.length} talking photos`)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Get HeyGen avatars error:', error)
    
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