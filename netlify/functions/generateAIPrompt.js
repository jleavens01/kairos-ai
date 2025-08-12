import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini AI 설정 - API 키가 없으면 null
const genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null

// 이미지 크기를 비율로 변환
function convertSizeToRatio(size) {
  const ratioMap = {
    '1024x1024': '1:1',
    '1024x768': '4:3',
    '768x1024': '3:4',
    '1920x1080': '16:9',
    '1080x1920': '9:16',
    '1280x720': '16:9',
    '720x1280': '9:16',
    '512x512': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4'
  }
  
  return ratioMap[size] || '16:9' // 기본값 16:9
}

export const handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리
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
    // 인증 확인
    const token = event.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    // 요청 데이터 파싱
    const { scene, projectContext, imageType, imageSize } = JSON.parse(event.body)

    if (!scene || !scene.script) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Scene script is required' })
      }
    }

    // Gemini API 키가 없으면 기본 프롬프트 생성
    if (!genAI) {
      console.log('Google API key not found, using fallback prompt generation')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          prompt: generateBasicPrompt(scene, imageType, imageSize),
          method: 'fallback',
          message: 'Google API key not configured'
        })
      }
    }

    // Gemini 모델 초기화 (gemini-2.0-flash-exp 사용)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      }
    })

    // 이미지 비율 계산
    const aspectRatio = convertSizeToRatio(imageSize)
    
    // AI 프롬프트 생성 요청
    const prompt = `당신은 스토리보드 스크립트를 이미지 생성 프롬프트로 변환하는 전문가입니다.
주어진 스크립트를 분석하여 간결하고 명확한 이미지 생성 프롬프트를 만들어주세요.

입력 정보:
씬 번호: ${scene.scene_number}
스크립트: ${scene.script}
${scene.characters ? `등장인물: ${scene.characters.join(', ')}` : ''}

반드시 다음 형식으로만 출력하세요:

씬 ${scene.scene_number}: [스크립트를 한 문장으로 시각적으로 요약]
등장인물: [캐릭터 이름과 간단한 설명]
배경: [구체적인 장소 설명]
카메라 사이즈: [적절한 카메라 앵글 - 클로즈업, 미디엄샷, 풀샷, 익스트림 풀샷 등 대부분 상황 전체가 잘 보여지는 익스트림 풀샷을 사용]
이미지 비율: ${aspectRatio}
**중요: 캐릭터 신체 비율 유지

예시:
씬 8: 수도 한양을 지키던 방어선이 속수무책으로 뚫리는 것을 목격한 왕과 신하들의 긴박한 모습
등장인물: 인조(조선 16대 왕, 긴장된 표정), 조선 신하들(우려스러운 표정)
배경: 조선 궁궐 대전, 창문 너머로 보이는 전쟁의 연기
카메라 사이즈: 궁궐 전체가 다 보여지는 익스트림 풀샷
이미지 비율: ${aspectRatio}
**중요: 캐릭터 신체 비율 유지`

    // Gemini API 호출
    const result = await model.generateContent(prompt)
    const response = await result.response
    const aiGeneratedPrompt = response.text()
    
    if (!aiGeneratedPrompt) {
      // Gemini API가 실패할 경우 기본 프롬프트 생성
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          prompt: generateBasicPrompt(scene, imageType, imageSize),
          method: 'fallback'
        })
      }
    }

    // 프롬프트 파싱 및 구조화
    const parsedPrompt = parseAIPrompt(aiGeneratedPrompt)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        prompt: parsedPrompt.mainPrompt,
        styleTags: parsedPrompt.styleTags,
        technicalSpecs: parsedPrompt.technicalSpecs,
        fullPrompt: parsedPrompt.fullPrompt,
        method: 'gemini'
      })
    }

  } catch (error) {
    console.error('Generate AI prompt error:', error)
    
    // 에러 발생 시 기본 프롬프트 반환
    try {
      const { scene, imageType, imageSize } = JSON.parse(event.body)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          prompt: generateBasicPrompt(scene, imageType, imageSize),
          method: 'fallback',
          error: error.message
        })
      }
    } catch (fallbackError) {
      // 폴백도 실패하면 에러 반환
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message || 'AI prompt generation failed',
          method: 'error'
        })
      }
    }
  }
}

// AI 응답 파싱 - 간단한 형식 그대로 사용
function parseAIPrompt(aiResponse) {
  // AI가 생성한 프롬프트를 그대로 사용
  const cleanedResponse = aiResponse.trim()
  
  // 기술 사양 추출 (선택사항)
  let technicalSpecs = {}
  const lines = cleanedResponse.split('\n')
  lines.forEach(line => {
    if (line.includes('카메라 사이즈:')) {
      technicalSpecs.cameraAngle = line.split(':')[1]?.trim()
    }
    if (line.includes('이미지 비율:')) {
      technicalSpecs.aspectRatio = line.split(':')[1]?.trim()
    }
  })
  
  return {
    mainPrompt: cleanedResponse,
    styleTags: [],
    technicalSpecs,
    fullPrompt: cleanedResponse
  }
}

// 기본 프롬프트 생성 (폴백)
function generateBasicPrompt(scene, imageType = 'scene', imageSize = '1024x1024') {
  // 스크립트를 간단히 요약
  const scriptSummary = scene.script ? scene.script.substring(0, 100) + '...' : '장면'
  
  let prompt = `씬 ${scene.scene_number}: ${scriptSummary}`
  
  // 등장인물 추가
  if (scene.characters && scene.characters.length > 0) {
    prompt += `\n등장인물: ${scene.characters.join(', ')}`
  } else {
    prompt += `\n등장인물: 인물들`
  }
  
  // 배경 추가
  if (scene.location) {
    prompt += `\n배경: ${scene.location}`
  } else if (scene.backgrounds && scene.backgrounds.length > 0) {
    prompt += `\n배경: ${scene.backgrounds[0]}`
  } else {
    // 스크립트에서 배경 추론
    const script = (scene.script || '').toLowerCase()
    if (script.includes('궁궐') || script.includes('왕')) {
      prompt += `\n배경: 조선 궁궐`
    } else if (script.includes('전투') || script.includes('전쟁')) {
      prompt += `\n배경: 전쟁터`
    } else {
      prompt += `\n배경: 실내`
    }
  }
  
  // 카메라 사이즈 추가
  const characterCount = scene.characters ? scene.characters.length : 1
  if (characterCount > 3) {
    prompt += `\n카메라 사이즈: 풀샷 (Full Shot)`
  } else if (characterCount === 2) {
    prompt += `\n카메라 사이즈: 투샷 (Two Shot)`
  } else {
    prompt += `\n카메라 사이즈: 미디엄샷 (Medium Shot)`
  }
  
  // 이미지 비율 - 선택된 이미지 크기 기반
  const aspectRatio = convertSizeToRatio(imageSize)
  prompt += `\n이미지 비율: ${aspectRatio}`
  
  // 중요 노트
  prompt += `\n**중요: 캐릭터 신체 비율 유지`
  
  return prompt
}