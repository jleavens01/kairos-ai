// Pexels API를 활용한 이미지 검색
// 완전 무료, 제한 없음

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { query, page = 1, per_page = 20 } = JSON.parse(event.body);

    if (!query || query.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Search query is required' })
      };
    }

    // Pexels API 키 확인
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    
    console.log('Pexels API check:');
    console.log('- API key exists:', !!PEXELS_API_KEY);
    console.log('- Search query:', query);
    
    if (!PEXELS_API_KEY) {
      console.log('No Pexels API key found in environment variables');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            query: query.trim(),
            results: [],
            total: 0,
            totalPages: 0,
            currentPage: page,
            message: 'Pexels API key not configured. Please set PEXELS_API_KEY in your environment variables.'
          }
        })
      };
    }

    // Pexels API 호출
    const params = new URLSearchParams({
      query: query.trim(),
      page: page.toString(),
      per_page: Math.min(per_page, 80).toString(), // Pexels max is 80
      locale: 'ko-KR'
    });
    
    const searchUrl = `https://api.pexels.com/v1/search?${params}`;

    console.log('Calling Pexels API...');
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });
    
    console.log('Pexels API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pexels API error:', response.status, errorText);
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Pexels API response:', { 
      total_results: data.total_results,
      page: data.page,
      per_page: data.per_page,
      photos: data.photos?.length 
    });

    // 결과 포맷팅
    const results = data.photos?.map(photo => ({
      id: `pexels_${photo.id}`,
      title: photo.alt || 'Pexels Photo',
      description: `Photo by ${photo.photographer}`,
      image: photo.src.large,
      thumbnail: photo.src.medium,
      original: photo.src.original,
      url: photo.url,
      width: photo.width,
      height: photo.height,
      color: photo.avg_color,
      user: photo.photographer,
      userLink: photo.photographer_url,
      source: 'pexels',
      sourceLabel: 'Pexels',
      license: 'Pexels License',
      attribution: {
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url
      }
    })) || [];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          query: query.trim(),
          results: results,
          total: data.total_results || 0,
          totalPages: Math.ceil((data.total_results || 0) / per_page),
          currentPage: data.page || page
        }
      })
    };

  } catch (error) {
    console.error('Pexels search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Pexels search failed',
        message: error.message
      })
    };
  }
};