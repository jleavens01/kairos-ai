// Google Imagen 3을 직접 사용하는 이미지 생성/편집 (기존 FAL AI 대체)
import { handler as googleImagenHandler } from './generateGeminiFlashImage.js';

export const generateImage = async ({
  prompt,
  referenceImages = [],
  imageSize = '1:1',
  style,
  projectId,
  sceneNumber,
  sceneId,
  sceneName,
  category = 'scene',
  elementName,
  user,
  supabaseAdmin,
  metadata = {}
}) => {
  console.log('Redirecting to Google Imagen 3 direct API...');
  
  // 새로운 Google 직접 연결 방식으로 리다이렉트
  // HTTP 이벤트 객체 구성
  const mockEvent = {
    httpMethod: 'POST',
    headers: {
      authorization: `Bearer ${JSON.stringify(user)}`  // 임시로 user 객체를 JWT처럼 처리
    },
    body: JSON.stringify({
      prompt,
      referenceImages,
      imageSize,
      style,
      projectId,
      sceneNumber,
      sceneId,
      sceneName,
      category,
      elementName,
      metadata
    })
  };

  // Google Imagen 3 핸들러 호출
  const result = await googleImagenHandler(mockEvent);
  
  if (result.statusCode === 200) {
    const responseData = JSON.parse(result.body);
    return responseData;
  } else {
    const errorData = JSON.parse(result.body);
    throw new Error(errorData.error || 'Image generation failed');
  }
};

// 기존 FAL AI 폴링 함수는 더 이상 필요하지 않음 (Google 직접 연결로 대체됨)