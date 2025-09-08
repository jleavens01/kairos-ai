// 이미지에서 태그를 추출하는 함수 (Gemini 1.5 사용)
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  let user;
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // 사용자 인증
    const authHeader = event.headers.authorization;
    if (!authHeader) throw { statusCode: 401, message: 'Authorization header is missing.' };
    
    const token = authHeader.split(' ')[1];
    if (!token) throw { statusCode: 401, message: 'Token is missing.' };
    
    // JWT 검증
    try {
      user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      if (!user || !user.sub) throw { statusCode: 401, message: 'Invalid token payload.' };
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      throw { statusCode: 401, message: 'Invalid token.' };
    }

    const { imageUrl, imageId } = JSON.parse(event.body || '{}');

    if (!imageUrl) {
      throw new Error('imageUrl is required.');
    }

    console.log('Extracting tags for image:', imageUrl);

    // 이미지 다운로드
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image.');
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageData = Buffer.from(imageBuffer);
    const base64Image = imageData.toString('base64');

    // Gemini 1.5 초기화
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    // 태그 추출 프롬프트 (한글 5개)
    const tagPrompt = `이 AI 생성 이미지를 분석하고 가장 중요한 특징을 나타내는 한글 태그 5개를 추출해주세요.

다음 카테고리에서 균형있게 선택해주세요:
1. 스타일 (예: 애니메이션, 실사, 수채화)
2. 주제/대상 (예: 인물, 풍경, 동물)
3. 분위기 (예: 따뜻한, 차가운, 신비로운)
4. 색상 (예: 파란색, 붉은톤, 파스텔)
5. 장면/배경 (예: 실내, 야외, 도시)

JSON 배열 형태로만 반환하고 다른 설명은 하지 마세요.
예시: ["애니메이션", "캐릭터", "따뜻한분위기", "주황색톤", "실내"]

정확히 5개의 간단명료한 한글 태그를 제공해주세요.`;

    const result = await model.generateContent([
      tagPrompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image
        }
      }
    ]);

    const response = result.response.text().trim();
    console.log('Gemini response:', response);
    
    let extractedTags = [];
    
    // JSON 파싱 시도
    try {
      // JSON 배열만 추출 (마크다운이나 다른 텍스트 제거)
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        extractedTags = JSON.parse(jsonMatch[0]);
        console.log('Extracted tags:', extractedTags);
      } else {
        // 폴백: 콤마로 구분된 텍스트 처리
        extractedTags = response
          .split(',')
          .map(tag => tag.trim().replace(/["\[\]]/g, ''))
          .filter(tag => tag.length > 0);
      }
    } catch (parseError) {
      console.error('Failed to parse tags:', parseError);
      // 기본 태그 세트 반환
      extractedTags = ['ai-generated', 'digital-art'];
    }

    // imageId가 있으면 DB 업데이트
    if (imageId) {
      // 기존 태그 가져오기
      const { data: imageRecord } = await supabaseAdmin
        .from('gen_images')
        .select('tags')
        .eq('id', imageId)
        .single();

      const existingTags = imageRecord?.tags || [];
      const allTags = [...new Set([...existingTags, ...extractedTags])];

      // DB 업데이트
      await supabaseAdmin
        .from('gen_images')
        .update({
          tags: allTags,
          metadata: {
            gemini_tags: extractedTags,
            tag_extraction_model: 'gemini-1.5-flash',
            tag_extracted_at: new Date().toISOString()
          }
        })
        .eq('id', imageId);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: extractedTags,
        count: extractedTags.length
      })
    };

  } catch (error) {
    console.error('Error in extractImageTags function:', error.message || error);
    
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Internal server error.';
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    };
  }
};