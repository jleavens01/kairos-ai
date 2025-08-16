// Unsplash API를 활용한 이미지 검색
// Unsplash API 키가 필요합니다

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

    // Unsplash API 키 확인 (환경 변수에서 가져오기)
    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    
    console.log('Unsplash API check:');
    console.log('- Access key exists:', !!UNSPLASH_ACCESS_KEY);
    console.log('- Search query:', query);
    
    if (!UNSPLASH_ACCESS_KEY) {
      console.log('No Unsplash API key found in environment variables');
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
            message: 'Unsplash API key not configured. Please set UNSPLASH_ACCESS_KEY in your environment variables.'
          }
        })
      };
    }

    // Unsplash API 호출
    const params = new URLSearchParams({
      query: query.trim(),
      page: page.toString(),
      per_page: Math.min(per_page, 30).toString(), // Unsplash max is 30
      orientation: 'landscape', // landscape, portrait, squarish
      content_filter: 'high' // low, high
    });
    
    const searchUrl = `https://api.unsplash.com/search/photos?${params}`;

    console.log('Calling Unsplash API...');
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      }
    });
    
    console.log('Unsplash API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unsplash API error:', response.status, errorText);
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Unsplash API response:', { 
      total: data.total, 
      total_pages: data.total_pages,
      results: data.results?.length 
    });

    // 결과 포맷팅
    const results = data.results?.map(photo => ({
      id: photo.id,
      title: photo.description || photo.alt_description || 'Untitled',
      description: `By ${photo.user.name}`,
      image: photo.urls.regular,
      thumbnail: photo.urls.small,
      original: photo.urls.full,
      url: photo.links.html,
      width: photo.width,
      height: photo.height,
      color: photo.color,
      user: photo.user.name,
      userLink: photo.user.links.html,
      source: 'unsplash',
      license: 'Unsplash License',
      attribution: {
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html
      },
      downloadUrl: photo.links.download
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
          total: data.total || 0,
          totalPages: data.total_pages || 0,
          currentPage: page
        }
      })
    };

  } catch (error) {
    console.error('Unsplash search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Unsplash search failed',
        message: error.message
      })
    };
  }
};