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
        body: JSON.stringify({ error: 'Name is required' })
      }
    }

    if (!requestData.photo_data && !requestData.photo_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Photo data or photo URL is required' })
      }
    }

    // 이미지 URL 처리
    let photoUrl = requestData.photo_url

    // Base64 데이터가 제공된 경우 임시 URL로 변환 (실제 구현시에는 Supabase Storage 등에 업로드)
    if (requestData.photo_data && !photoUrl) {
      // 실제 구현에서는 이 부분에서 Supabase Storage에 업로드하고 공개 URL을 받아야 합니다
      // 현재는 base64 데이터를 직접 사용 (HeyGen API가 지원하는지 확인 필요)
      photoUrl = requestData.photo_data
    }

    // HeyGen API 페이로드 구성
    const heygenPayload = {
      name: requestData.name,
      photo_url: photoUrl,
      age: requestData.age || 'Young Adult', // Young Adult, Early Middle Age, Late Middle Age, Senior, Unspecified
      gender: requestData.gender || 'Unspecified', // Woman, Man, Unspecified
      ethnicity: requestData.ethnicity || 'Unspecified', // East Asian, Southeast Asian, South Asian, Middle Eastern, Latino, Black, White, Mixed, Unspecified
      orientation: requestData.orientation || 'square', // square, horizontal, vertical
      pose: requestData.pose || 'half_body', // half_body, close_up, full_body
      style: requestData.style || 'Realistic', // Realistic, Pixar, Cinematic, Vintage, Noir, Cyberpunk, Unspecified
      appearance: requestData.appearance || '', // Description/Prompt, maximum 1000 characters
      callback_id: requestData.callback_id || `photo_avatar_${Date.now()}`
    }

    // 콜백 URL이 제공된 경우 추가
    if (requestData.callback_url) {
      heygenPayload.callback_url = requestData.callback_url
    }

    // HeyGen API 호출
    console.log('Calling HeyGen photo avatar API with payload:', JSON.stringify(heygenPayload, null, 2))

    const heygenResponse = await fetch('https://api.heygen.com/v2/photo_avatar/photo/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(heygenPayload)
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen photo avatar API response status:', heygenResponse.status)
    console.log('HeyGen photo avatar API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen photo avatar API response:', parseError)
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
      console.error('HeyGen photo avatar API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen photo avatar API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 성공 응답
    console.log('Photo avatar generation successful:', JSON.stringify(heygenResult, null, 2))
    console.log('HeyGen result keys:', Object.keys(heygenResult))
    console.log('HeyGen result data keys:', heygenResult.data ? Object.keys(heygenResult.data) : 'No data object')
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        job_id: heygenResult.data?.generation_id || heygenResult.generation_id || heygenResult.job_id || heygenResult.id,
        generation_id: heygenResult.data?.generation_id || heygenResult.generation_id,
        message: 'Photo avatar generation started successfully',
        callback_id: heygenPayload.callback_id,
        estimated_time: 'Usually takes 1-3 minutes',
        status: 'processing',
        data: heygenResult.data, // 원본 데이터도 포함
        request_params: {
          name: heygenPayload.name,
          age: heygenPayload.age,
          gender: heygenPayload.gender,
          ethnicity: heygenPayload.ethnicity,
          style: heygenPayload.style
        }
      })
    }

  } catch (error) {
    console.error('Photo avatar generation error:', error)
    
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