import { GoogleGenerativeAI } from '@google/generative-ai'

export const handler = async (event) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { prompt, model = 'gemini-2.0-flash-lite' } = JSON.parse(event.body)

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'prompt is required' })
      }
    }

    // Google AI API 키 확인 (기존 패턴 사용)
    const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GENERATIVE_LANGUAGE_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Google AI API key not configured' })
      }
    }

    console.log(`Gemini 요청: 모델=${model}, 프롬프트 길이=${prompt.length}`)

    // GoogleGenerativeAI 클라이언트 초기화
    const genAI = new GoogleGenerativeAI(apiKey)
    const geminiModel = genAI.getGenerativeModel({ model: model })

    // 텍스트 생성 요청
    const result = await geminiModel.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log(`Gemini 응답 성공: ${text.length}글자`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        text: text,
        model: model
      })
    }

  } catch (error) {
    console.error('Gemini API 오류:', error)
    
    let errorMessage = 'Internal server error'
    let statusCode = 500

    if (error.message.includes('API key')) {
      errorMessage = 'Invalid API key'
      statusCode = 401
    } else if (error.message.includes('quota')) {
      errorMessage = 'API quota exceeded'
      statusCode = 429
    } else if (error.message.includes('model')) {
      errorMessage = 'Invalid model specified'
      statusCode = 400
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}