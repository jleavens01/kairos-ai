// Google Maps API 설정을 안전하게 제공하는 엔드포인트
export const handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 서버 사이드에서 API 키 가져오기
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // 클라이언트에 필요한 설정만 전달
    // Maps JavaScript API는 클라이언트에서 직접 사용되므로 키 전달이 필요
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          apiKey: apiKey,
          // 추가 설정
          libraries: ['places', 'geometry'],
          version: 'beta',
          language: 'ko',
          region: 'KR'
        }
      })
    };
  } catch (error) {
    console.error('Get Maps config error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};