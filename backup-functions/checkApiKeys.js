// API 키 존재 여부 확인 (키 값은 노출하지 않음)

export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 각 API 키 존재 여부만 확인
    const keys = {
      pixabay: !!process.env.PIXABAY_API_KEY,
      unsplash: !!process.env.UNSPLASH_ACCESS_KEY,
      pexels: !!process.env.PEXELS_API_KEY,
      flickr: !!process.env.FLICKR_API_KEY,
      europeana: !!process.env.EUROPEANA_API_KEY,
      dpla: !!process.env.DPLA_API_KEY,
      // API 키가 필요없는 소스들
      wikipedia: true,
      commons: true,
      met: true
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        keys: keys
      })
    };

  } catch (error) {
    console.error('Error checking API keys:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to check API keys'
      })
    };
  }
};