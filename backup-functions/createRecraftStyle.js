// Recraft 커스텀 스타일 생성 API
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
    if (!requestData.style_name || !requestData.style_name.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'style_name is required' })
      }
    }

    if (!requestData.image_urls || !Array.isArray(requestData.image_urls) || requestData.image_urls.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'image_urls array is required and must not be empty' })
      }
    }

    if (requestData.image_urls.length > 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Maximum 5 images allowed for style creation' })
      }
    }

    console.log(`Starting Recraft style creation: ${requestData.style_name}`)
    console.log(`Images count: ${requestData.image_urls.length}`)

    // FormData 생성
    const formData = new FormData()
    formData.append('style_name', requestData.style_name)

    // 스타일 설명 추가 (선택사항)
    if (requestData.description) {
      formData.append('description', requestData.description)
    }

    // 이미지들 다운로드하여 FormData에 추가
    const imageFiles = []
    for (let i = 0; i < requestData.image_urls.length; i++) {
      const imageUrl = requestData.image_urls[i]
      
      try {
        console.log(`Downloading image ${i + 1}: ${imageUrl}`)
        
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image ${i + 1}: ${imageResponse.status}`)
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        
        const imageBlob = new Blob([imageBuffer], { type: contentType })
        
        // 파일명 생성 (확장자 추출)
        const extension = contentType.includes('png') ? 'png' : 'jpg'
        const fileName = `style_image_${i + 1}.${extension}`
        
        formData.append('images', imageBlob, fileName)
        
        imageFiles.push({
          index: i + 1,
          url: imageUrl,
          size: imageBuffer.byteLength,
          type: contentType,
          fileName
        })

        console.log(`Image ${i + 1} processed: ${fileName} (${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`)
        
      } catch (imageError) {
        console.error(`Failed to process image ${i + 1}:`, imageError)
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Failed to download image ${i + 1}`,
            details: imageError.message,
            image_url: imageUrl
          })
        }
      }
    }

    console.log(`All ${imageFiles.length} images processed successfully`)

    // Recraft API 호출
    console.log('Calling Recraft style creation API...')
    
    const recraftResponse = await fetch('https://external.api.recraft.ai/v1/styles', {
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
          error: 'Recraft style creation failed',
          message: recraftResult.message || recraftResult.error || 'Unknown error',
          details: recraftResult
        })
      }
    }

    // 스타일 ID 추출
    const styleId = recraftResult.id || recraftResult.style_id
    if (!styleId) {
      console.error('No style ID in Recraft response:', recraftResult)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'No style ID received from Recraft API',
          details: recraftResult
        })
      }
    }

    console.log('Style creation successful:', styleId)

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

    // 데이터베이스에 스타일 정보 저장 (선택사항)
    if (userId) {
      try {
        const { error: insertError } = await supabase
          .from('custom_styles')
          .insert({
            user_id: userId,
            style_id: styleId,
            style_name: requestData.style_name,
            description: requestData.description || null,
            image_count: imageFiles.length,
            image_urls: requestData.image_urls,
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Failed to save style to database:', insertError)
          // 데이터베이스 저장 실패해도 API 응답은 성공으로 처리
        } else {
          console.log('Style saved to database successfully')
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // 데이터베이스 오류가 있어도 API 응답은 성공으로 처리
      }
    }

    // 크레딧 비용 계산 (스타일 생성은 100 크레딧)
    const creditCost = 100

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        style_id: styleId,
        style_name: requestData.style_name,
        description: requestData.description || null,
        image_count: imageFiles.length,
        images_processed: imageFiles,
        credit_cost: creditCost,
        message: 'Custom style created successfully',
        raw_response: recraftResult
      })
    }

  } catch (error) {
    console.error('Recraft style creation error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Style creation failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}