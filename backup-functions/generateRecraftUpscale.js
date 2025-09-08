// Recraft 이미지 업스케일 API
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
        body: JSON.stringify({ error: 'image_url is required for upscaling' })
      }
    }

    console.log('Starting Recraft image upscale for:', requestData.image_url)

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
    
    // 업스케일 배수는 UI에서만 사용 (Recraft API는 고정 배율)
    const upscale_factor = requestData.upscale_factor || 4
    
    // 응답 형식 (URL 또는 Base64)
    formData.append('response_format', requestData.response_format || 'url')

    console.log(`Crisp upscale - selected factor: ${upscale_factor}x (API uses fixed scale)`)

    // Recraft API 호출 - Crisp Upscale 사용
    console.log('Calling Recraft crisp upscale API...')
    
    const recraftResponse = await fetch('https://external.api.recraft.ai/v1/images/crispUpscale', {
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
          error: 'Recraft upscale failed',
          message: recraftResult.message || recraftResult.error || 'Unknown error',
          details: recraftResult
        })
      }
    }

    // 업스케일된 이미지 URL 추출
    const upscaledUrl = recraftResult.image?.url || recraftResult.url
    if (!upscaledUrl) {
      console.error('No upscaled image URL in Recraft response:', recraftResult)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'No upscaled image URL received from Recraft API',
          details: recraftResult
        })
      }
    }

    console.log('Image upscale successful:', upscaledUrl)

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

    // 업스케일 결과를 데이터베이스에 저장 (선택사항)
    if (userId && requestData.original_image_id) {
      try {
        const { error: insertError } = await supabase
          .from('gen_processed_images')
          .insert({
            user_id: userId,
            original_image_id: requestData.original_image_id,
            original_image_url: requestData.image_url,
            processed_image_url: upscaledUrl,
            process_type: 'upscale',
            model: 'recraft-upscale',
            status: 'completed',
            credit_cost: getCreditCost(upscale_factor),
            metadata: {
              upscale_factor: upscale_factor
            },
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Failed to save upscale result to database:', insertError)
          // 데이터베이스 저장 실패해도 API 응답은 성공으로 처리
        } else {
          console.log('Upscale result saved to database successfully')
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // 데이터베이스 오류가 있어도 API 응답은 성공으로 처리
      }
    }

    // 크레딧 비용 계산 (업스케일 배수에 따라)
    const creditCost = getCreditCost(upscale_factor)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        upscaled_url: upscaledUrl,
        original_url: requestData.image_url,
        upscale_factor: upscale_factor,
        model: 'recraft-upscale',
        format: 'image',
        credit_cost: creditCost,
        message: `Image successfully upscaled ${upscale_factor}x`,
        raw_response: recraftResult
      })
    }

  } catch (error) {
    console.error('Recraft upscale error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Image upscale failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}

// 크레딧 비용 계산 (업스케일 배수별)
function getCreditCost(upscaleFactor) {
  // Recraft 업스케일 모델별 크레딧 비용
  const baseCosts = {
    2: 30,   // 2x 업스케일
    4: 60,   // 4x 업스케일 (기본값)
    8: 120   // 8x 업스케일
  }
  
  return baseCosts[upscaleFactor] || 60
}