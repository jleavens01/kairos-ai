// Gemini 1.5 Flash를 사용한 프롬프트 번역 함수

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  // API 키를 함수 밖에서 먼저 정의
  const apiKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;

  try {
    // 요청 데이터 파싱
    const { prompt, negativePrompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // API 키 확인 - Netlify 환경변수 디버깅
    if (!apiKey) {
      console.error('Google API key is not configured');
      console.error('Environment check:', {
        hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
        hasViteGoogleApiKey: !!process.env.VITE_GOOGLE_API_KEY,
        availableKeys: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('API')).slice(0, 5)
      });
      
      // 환경변수가 없을 때는 원문을 그대로 반환
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            originalPrompt: prompt,
            translatedPrompt: prompt, // 번역 없이 원문 반환
            originalNegativePrompt: negativePrompt || null,
            translatedNegativePrompt: negativePrompt || null,
            warning: 'Translation service not configured - returning original text'
          }
        })
      };
    }

    // GoogleGenerativeAI 동적 import로 변경
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 번역 프롬프트 생성
    const translationPrompt = `
You are a professional translator specializing in AI image/video generation prompts.
Translate the following Korean text to English, maintaining the technical terms and artistic descriptions.
Keep the translation natural and suitable for AI generation models.

Rules:
1. Preserve technical terms and style descriptors
2. Keep the translation concise and clear
3. Maintain the original intent and mood
4. If the text is already in English or contains mixed languages, optimize it for clarity
5. Return ONLY the translated text without any explanation or additional text

Korean text to translate:
${prompt}
`;

    // 프롬프트 번역
    const promptResult = await model.generateContent(translationPrompt);
    const translatedPrompt = promptResult.response.text().trim();

    // 네거티브 프롬프트 번역 (있는 경우)
    let translatedNegativePrompt = '';
    if (negativePrompt) {
      const negativeTranslationPrompt = `
You are a professional translator specializing in AI image/video generation prompts.
Translate the following Korean negative prompt to English.
This is a negative prompt that describes what should NOT appear in the generated image/video.

Rules:
1. Keep technical terms for unwanted elements
2. Maintain clarity about what to avoid
3. Return ONLY the translated text without any explanation

Korean negative prompt to translate:
${negativePrompt}
`;

      const negativeResult = await model.generateContent(negativeTranslationPrompt);
      translatedNegativePrompt = negativeResult.response.text().trim();
    }

    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          originalPrompt: prompt,
          translatedPrompt,
          originalNegativePrompt: negativePrompt || null,
          translatedNegativePrompt: translatedNegativePrompt || null
        }
      })
    };

  } catch (error) {
    console.error('Translation error:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Error stack:', error.stack);
    
    // 더 자세한 에러 정보 반환
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Translation failed',
        errorType: error.constructor.name,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};