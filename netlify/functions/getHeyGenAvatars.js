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

    // HeyGen API 호출 - 아바타 목록과 Photo Avatar Groups 병렬로 가져오기
    console.log('Fetching HeyGen avatars and photo avatar groups')

    const [avatarResponse, photoGroupResponse] = await Promise.all([
      // 일반 아바타와 토킹포토 가져오기
      fetch('https://api.heygen.com/v2/avatars', {
        method: 'GET',
        headers: {
          'x-api-key': heygenApiKey,
          'Accept': 'application/json'
        }
      }),
      // Photo Avatar Groups 가져오기 (include_public=false로 사용자 생성 아바타만)
      fetch('https://api.heygen.com/v2/avatar_group.list?include_public=false', {
        method: 'GET',
        headers: {
          'x-api-key': heygenApiKey,
          'Accept': 'application/json'
        }
      })
    ])

    // 일반 아바타 응답 처리
    const avatarResponseText = await avatarResponse.text()
    console.log('HeyGen avatars API response status:', avatarResponse.status)
    console.log('HeyGen avatars API response text:', avatarResponseText.substring(0, 500))

    let avatarResult
    try {
      avatarResult = JSON.parse(avatarResponseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen avatars API response:', parseError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response format from HeyGen avatars API',
          details: avatarResponseText.substring(0, 200)
        })
      }
    }

    if (!avatarResponse.ok) {
      console.error('HeyGen avatars API error:', avatarResult)
      return {
        statusCode: avatarResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen avatars API request failed',
          message: avatarResult.message || avatarResult.error || 'Unknown error',
          details: avatarResult
        })
      }
    }

    // Photo Avatar Groups 응답 처리
    const photoGroupResponseText = await photoGroupResponse.text()
    console.log('HeyGen photo groups API response status:', photoGroupResponse.status)
    console.log('HeyGen photo groups API response text:', photoGroupResponseText.substring(0, 500))

    let photoGroupResult
    try {
      photoGroupResult = JSON.parse(photoGroupResponseText)
    } catch (parseError) {
      console.warn('Failed to parse HeyGen photo groups API response:', parseError)
      photoGroupResult = { data: { avatar_group_list: [] } } // fallback
    }

    if (!photoGroupResponse.ok) {
      console.warn('HeyGen photo groups API error:', photoGroupResult)
      photoGroupResult = { data: { avatar_group_list: [] } } // fallback
    }

    // 아바타 데이터 정리 및 변환
    const avatars = avatarResult.avatars || []
    const talkingPhotos = avatarResult.talking_photos || []
    const photoGroups = photoGroupResult.data?.avatar_group_list || []

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

    // Photo Avatar Groups 처리 (ready 상태인 것만 포함)
    const processedPhotoGroups = photoGroups
      .filter(group => group.train_status === 'ready')
      .map(group => ({
        id: group.id,
        name: group.name,
        thumbnail: group.preview_image,
        type: 'photo_avatar_group',
        train_status: group.train_status,
        num_looks: group.num_looks,
        created_at: group.created_at
      }))

    // 성공 응답
    const response = {
      success: true,
      avatars: processedAvatars,
      talking_photos: processedTalkingPhotos,
      photo_avatar_groups: processedPhotoGroups,
      total_avatars: processedAvatars.length,
      total_talking_photos: processedTalkingPhotos.length,
      total_photo_avatar_groups: processedPhotoGroups.length
    }

    console.log(`Successfully fetched ${processedAvatars.length} avatars, ${processedTalkingPhotos.length} talking photos, and ${processedPhotoGroups.length} photo avatar groups`)
    
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