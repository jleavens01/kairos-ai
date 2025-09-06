// Recraft T2I 이미지 생성 API
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// generateImage 함수 (라우터에서 호출용)
export const generateImage = async (data) => {
  const { user, supabaseAdmin, ...requestData } = data
  
  try {
    // Recraft API 키 확인
    const recraftApiKey = process.env.RECRAFT_API_KEY
    if (!recraftApiKey) {
      throw new Error('Recraft API key is not configured')
    }

    // 필수 필드 검증
    if (!requestData.prompt) {
      throw new Error('prompt is required for image generation')
    }

    const prompt = requestData.prompt
    // model 매핑: UI 모델명 → Recraft API 모델명
    const modelMapping = {
      'recraft-v3': 'recraftv3',
      'recraft-realistic': 'recraft20b'
    }
    const model = modelMapping[requestData.model] || 'recraftv3'
    const style = requestData.parameters?.style || 'realistic_image'
    const substyle = requestData.parameters?.substyle
    const size = convertSizeFormat(requestData.imageSize || '1:1')
    
    console.log('Received requestData:', {
      model: requestData.model,
      parameters_style: requestData.parameters?.style,
      parameters_substyle: requestData.parameters?.substyle,
      mapped_model: model,
      final_style: style
    })

    console.log(`Starting Recraft image generation - Model: ${model}, Style: ${style}, Size: ${size}`)

    // Recraft API 호출
    const recraftResponse = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${recraftApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        model: model,
        style: style,
        size: size,
        response_format: 'url'
      })
    })

    const responseText = await recraftResponse.text()
    console.log('Recraft API response status:', recraftResponse.status)
    console.log('Recraft API response text:', responseText)

    let recraftResult
    try {
      recraftResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Recraft API response:', parseError)
      throw new Error('Invalid response format from Recraft API')
    }

    if (!recraftResponse.ok) {
      console.error('Recraft API error:', recraftResult)
      throw new Error(recraftResult.message || recraftResult.error || 'Recraft generation failed')
    }

    // 생성된 이미지 URL 추출
    const imageUrl = recraftResult.data?.[0]?.url
    if (!imageUrl) {
      console.error('No image URL in Recraft response:', recraftResult)
      throw new Error('No image URL received from Recraft API')
    }

    console.log('Recraft image generation successful:', imageUrl)

    // 크레딧 비용 계산
    const modelName = model === 'recraftv3' ? 'recraft-v3' : 'recraft-realistic'
    const creditCost = getCreditCost(modelName, style)

    // 데이터베이스에 저장
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('gen_images')
      .insert({
        project_id: requestData.projectId,
        image_type: requestData.category || 'scene',
        element_name: requestData.characterName || 'Generated Image',
        generation_status: 'completed',
        result_image_url: imageUrl,
        thumbnail_url: imageUrl,
        prompt_used: prompt,
        style_name: style,
        generation_model: modelName,
        generation_params: {
          model: model,
          style: style,
          size: size,
          substyle: substyle
        },
        credits_cost: creditCost,
        metadata: recraftResult,
        created_at: new Date().toISOString()
      })
      .select('*')

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw new Error('Failed to save image to database')
    }

    return {
      success: true,
      image_url: imageUrl,
      image_id: insertData[0]?.id,
      id: insertData[0]?.id,
      image_type: requestData.category || 'scene',
      category: requestData.category || 'scene',
      status: 'completed',
      model: modelName,
      style: style,
      size: size,
      prompt: prompt,
      credit_cost: creditCost,
      raw_response: recraftResult
    }

  } catch (error) {
    console.error('Recraft image generation error:', error)
    throw error
  }
}

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
    if (!requestData.prompt || !requestData.prompt.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' })
      }
    }

    console.log('Starting Recraft image generation with prompt:', requestData.prompt)

    // Recraft 요청 페이로드 구성
    const recraftPayload = {
      prompt: requestData.prompt,
      style: requestData.style || 'realistic_image', // realistic_image, digital_illustration 등
      model: requestData.model === 'recraft-v3' ? 'recraftv3' : 'recraftv2',
      size: convertSizeFormat(requestData.size || '1:1'), // 비율을 Recraft 형식으로 변환
      n: 1, // 이미지 개수
      response_format: 'url'
    }

    // 참조 이미지가 있는 경우 (I2I)
    if (requestData.reference_images && requestData.reference_images.length > 0) {
      // 참조 이미지 처리는 복잡하므로 일단 T2I만 구현
      console.log('Reference images detected, but I2I not implemented yet')
    }

    // 고급 옵션
    if (requestData.negative_prompt) {
      recraftPayload.negative_prompt = requestData.negative_prompt
    }

    // 컨트롤 파라미터
    if (requestData.controls) {
      recraftPayload.controls = requestData.controls
    }

    // 커스텀 스타일 ID (기존 스타일 시스템과 통합)
    if (requestData.style_id) {
      recraftPayload.style_id = requestData.style_id
      delete recraftPayload.style // style과 style_id는 상호 배타적
      console.log('Using custom style ID:', requestData.style_id)
    }

    // 커스텀 스타일 사용 시 usage_count 증가 (선택사항)
    if (requestData.style_id && requestData.update_usage_count !== false) {
      try {
        // 현재 usage_count를 가져와서 1 증가
        const { data: currentStyle, error: fetchError } = await supabase
          .from('custom_styles')
          .select('usage_count')
          .eq('style_id', requestData.style_id)
          .single()

        if (!fetchError && currentStyle) {
          const { error: updateError } = await supabase
            .from('custom_styles')
            .update({ 
              usage_count: (currentStyle.usage_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('style_id', requestData.style_id)

          if (updateError) {
            console.warn('Failed to update style usage count:', updateError)
          } else {
            console.log(`Style usage count updated: ${requestData.style_id}`)
          }
        }
      } catch (usageError) {
        console.warn('Usage count update error:', usageError)
      }
    }

    console.log('Recraft payload:', JSON.stringify(recraftPayload, null, 2))

    // Recraft API 호출
    const recraftResponse = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${recraftApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recraftPayload)
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
          error: 'Recraft image generation failed',
          message: recraftResult.message || recraftResult.error || 'Unknown error',
          details: recraftResult
        })
      }
    }

    // 이미지 URL 추출
    const imageUrl = recraftResult.data?.[0]?.url || recraftResult.url
    if (!imageUrl) {
      console.error('No image URL in Recraft response:', recraftResult)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'No image URL received from Recraft API',
          details: recraftResult
        })
      }
    }

    console.log('Recraft image generation successful:', imageUrl)

    // 크레딧 비용 계산 (모델별)
    const creditCost = getCreditCost(requestData.model, requestData.style)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        image_url: imageUrl,
        model: requestData.model || 'recraft-v3',
        style: requestData.style || 'realistic_image',
        size: requestData.size || '1:1',
        prompt: requestData.prompt,
        credit_cost: creditCost,
        raw_response: recraftResult
      })
    }

  } catch (error) {
    console.error('Recraft image generation error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Image generation failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}

// 크기 형식 변환 (비율 → Recraft 형식)
function convertSizeFormat(sizeRatio) {
  const sizeMap = {
    '1:1': '1024x1024',
    '3:2': '1536x1024', 
    '2:3': '1024x1536',
    '4:3': '1365x1024',
    '3:4': '1024x1365',
    '16:9': '1820x1024',
    '9:16': '1024x1820',
    '21:9': '2048x878',
    '9:21': '878x2048'
  }
  
  return sizeMap[sizeRatio] || '1024x1024'
}

// 크레딧 비용 계산
function getCreditCost(model, style) {
  // Recraft 모델별 크레딧 비용
  const baseCosts = {
    'recraft-v3': 120,
    'recraft-realistic': 100,
    'recraft-v2': 80
  }
  
  const baseCost = baseCosts[model] || 120
  
  // 스타일별 추가 비용 (필요시)
  const styleCosts = {
    'digital_illustration': 0,
    'realistic_image': 10,
    'vector_illustration': -10
  }
  
  const styleCost = styleCosts[style] || 0
  
  return baseCost + styleCost
}