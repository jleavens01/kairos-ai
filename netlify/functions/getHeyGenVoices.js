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

    // HeyGen API 호출 - 음성 목록 가져오기 (locales 엔드포인트 사용)
    console.log('Fetching HeyGen voices list from locales endpoint')

    const heygenResponse = await fetch('https://api.heygen.com/v2/voices/locales', {
      method: 'GET',
      headers: {
        'x-api-key': heygenApiKey,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen voices API response status:', heygenResponse.status)
    console.log('HeyGen voices API response text:', responseText.substring(0, 500))

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen voices API response:', parseError)
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
      console.error('HeyGen voices API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen voices API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // 음성 데이터 정리 및 변환
    const voices = heygenResult.voices || []

    const processedVoices = voices.map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      language: voice.language,
      gender: voice.gender,
      preview_audio: voice.preview_audio,
      support_pause: voice.support_pause || false,
      emotion_support: voice.emotion_support || false,
      support_locale: voice.support_locale || false
    }))

    // 언어별로 그룹화
    const voicesByLanguage = processedVoices.reduce((acc, voice) => {
      const lang = voice.language || 'Unknown'
      if (!acc[lang]) {
        acc[lang] = []
      }
      acc[lang].push(voice)
      return acc
    }, {})

    // 한국어 음성을 우선적으로 정렬
    const sortedLanguages = Object.keys(voicesByLanguage).sort((a, b) => {
      if (a.includes('Korean') || a.includes('한국')) return -1
      if (b.includes('Korean') || b.includes('한국')) return 1
      if (a.includes('English')) return -1
      if (b.includes('English')) return 1
      return a.localeCompare(b)
    })

    // 성공 응답
    const response = {
      success: true,
      voices: processedVoices,
      voices_by_language: voicesByLanguage,
      languages: sortedLanguages,
      total_voices: processedVoices.length,
      statistics: {
        total: processedVoices.length,
        by_gender: processedVoices.reduce((acc, voice) => {
          const gender = voice.gender || 'unknown'
          acc[gender] = (acc[gender] || 0) + 1
          return acc
        }, {}),
        by_language: Object.keys(voicesByLanguage).map(lang => ({
          language: lang,
          count: voicesByLanguage[lang].length
        }))
      }
    }

    console.log(`Successfully fetched ${processedVoices.length} voices in ${sortedLanguages.length} languages`)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('Get HeyGen voices error:', error)
    
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