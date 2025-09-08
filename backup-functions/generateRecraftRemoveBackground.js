// Recraft 배경 제거 API
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
        body: JSON.stringify({ error: 'image_url is required for background removal' })
      }
    }

    console.log('Starting Recraft background removal for:', requestData.image_url)

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
    formData.append('file', imageBlob, 'image.jpg')
    
    // 응답 형식 설정 (기본값: url)
    formData.append('response_format', requestData.response_format || 'url')
    
    // 배경 제거 모드 설정 (선택사항)
    if (requestData.mode) {
      formData.append('mode', requestData.mode) // 'object', 'person' 등
    }

    console.log('Background removal settings configured')

    // Recraft API 호출
    console.log('Calling Recraft remove background API...')
    
    const recraftResponse = await fetch('https://external.api.recraft.ai/v1/images/removeBackground', {
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
          error: 'Recraft background removal failed',
          message: recraftResult.message || recraftResult.error || 'Unknown error',
          details: recraftResult
        })
      }
    }

    // 배경 제거된 이미지 URL 추출
    const processedUrl = recraftResult.image?.url || recraftResult.url
    if (!processedUrl) {
      console.error('No processed image URL in Recraft response:', recraftResult)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'No processed image URL received from Recraft API',
          details: recraftResult
        })
      }
    }

    console.log('Background removal successful:', processedUrl)

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

    // 배경 제거 결과를 데이터베이스에 저장 (선택사항)
    if (userId && requestData.original_image_id) {
      try {
        const { error: insertError } = await supabase
          .from('gen_processed_images')
          .insert({
            user_id: userId,
            original_image_id: requestData.original_image_id,
            original_image_url: requestData.image_url,
            processed_image_url: processedUrl,
            process_type: 'remove_background',
            model: 'recraft-background-removal',
            mode: requestData.mode || 'auto',
            status: 'completed',
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Failed to save background removal result to database:', insertError)
          // 데이터베이스 저장 실패해도 API 응답은 성공으로 처리
        } else {
          console.log('Background removal result saved to database successfully')
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // 데이터베이스 오류가 있어도 API 응답은 성공으로 처리
      }
    }

    // 크레딧 비용 계산 (배경 제거는 40 크레딧)
    const creditCost = 40

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        processed_url: processedUrl,
        original_url: requestData.image_url,
        process_type: 'remove_background',
        model: 'recraft-background-removal',
        mode: requestData.mode || 'auto',
        format: 'image',
        credit_cost: creditCost,
        message: 'Background successfully removed from image',
        raw_response: recraftResult
      })
    }

  } catch (error) {
    console.error('Recraft background removal error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Background removal failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}