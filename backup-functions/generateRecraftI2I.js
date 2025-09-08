// Recraft Image-to-Image API
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    // Recraft API 키 확인
    const recraftApiKey = process.env.RECRAFT_API_KEY
    if (!recraftApiKey) {
      console.error('RECRAFT_API_KEY is not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Recraft API key is not configured' })
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
    if (!requestData.image_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'image_url is required for image-to-image transformation' })
      }
    }

    if (!requestData.prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'prompt is required for image-to-image transformation' })
      }
    }

    console.log('Starting Recraft I2I for:', requestData.image_url)

    // 원본 이미지 다운로드
    const imageResponse = await fetch(requestData.image_url)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBlob = new Blob([imageBuffer], { 
      type: imageResponse.headers.get('content-type') || 'image/jpeg' 
    })

    console.log(`Downloaded image: ${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`)

    // FormData 생성
    const formData = new FormData()
    formData.append('image', imageBlob, 'image.jpg')
    formData.append('prompt', requestData.prompt)
    formData.append('strength', requestData.strength || '0.5') // 기본값 0.5
    formData.append('style', requestData.style || 'digital_illustration')
    formData.append('response_format', 'url')

    console.log('Calling Recraft I2I API...')
    
    // Recraft API 호출
    const recraftResponse = await fetch('https://external.api.recraft.ai/v1/images/imageToImage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${recraftApiKey}`
        // Content-Type은 FormData 사용 시 자동 설정
      },
      body: formData
    })

    const responseText = await recraftResponse.text()
    console.log('Recraft API response status:', recraftResponse.status)
    console.log('Recraft API response text:', responseText)

    let recraftResult
    try {
      recraftResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Recraft API response:', parseError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response format from Recraft API',
          details: responseText.substring(0, 500)
        })
      }
    }

    if (!recraftResponse.ok) {
      console.error('Recraft API error:', recraftResult)
      return {
        statusCode: recraftResponse.status,
        headers,
        body: JSON.stringify({
          error: 'Recraft I2I transformation failed',
          message: recraftResult.message || recraftResult.error || 'Unknown error',
          details: recraftResult
        })
      }
    }

    // 변환된 이미지 URL 추출
    const transformedUrl = recraftResult.data?.[0]?.url || recraftResult.url
    if (!transformedUrl) {
      console.error('No transformed image URL in Recraft response:', recraftResult)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'No transformed image URL received from Recraft API',
          details: recraftResult
        })
      }
    }

    console.log('I2I transformation successful:', transformedUrl)

    // 사용자 정보 확인 (데이터베이스 저장용)
    const authHeader = event.headers.authorization
    let userId = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)
        if (!userError && user) {
          userId = user.id
        }
      } catch (authError) {
        console.log('Auth check failed, continuing without user ID:', authError.message)
      }
    }

    // I2I 결과를 데이터베이스에 저장 (선택사항)
    if (userId && requestData.original_image_id) {
      try {
        const { error: insertError } = await supabase
          .from('gen_processed_images')
          .insert({
            user_id: userId,
            original_image_id: requestData.original_image_id,
            original_image_url: requestData.image_url,
            processed_image_url: transformedUrl,
            process_type: 'image_to_image',
            model: 'recraft-i2i',
            status: 'completed',
            credit_cost: 80, // I2I 변환 비용
            metadata: {
              prompt: requestData.prompt,
              strength: requestData.strength || '0.5',
              style: requestData.style || 'digital_illustration'
            },
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Failed to save I2I result to database:', insertError)
          // 데이터베이스 저장 실패해도 API 응답은 성공으로 처리
        } else {
          console.log('I2I result saved to database successfully')
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // 데이터베이스 오류가 있어도 API 응답은 성공으로 처리
      }
    }

    // 크레딧 차감 정보
    const creditCost = 80 // I2I 변환은 80 크레딧

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transformed_url: transformedUrl,
        original_url: requestData.image_url,
        prompt: requestData.prompt,
        strength: requestData.strength || '0.5',
        style: requestData.style || 'digital_illustration',
        model: 'recraft-i2i',
        format: 'image',
        credit_cost: creditCost,
        message: 'Image-to-Image transformation successful',
        raw_response: recraftResult
      })
    }

  } catch (error) {
    console.error('Recraft I2I error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Image-to-Image transformation failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}