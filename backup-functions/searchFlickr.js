// Flickr API를 활용한 이미지 검색
// Creative Commons 라이선스 이미지 중심

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

    // Flickr API 키 확인
    const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
    
    console.log('Flickr API check:');
    console.log('- API key exists:', !!FLICKR_API_KEY);
    console.log('- Search query:', query);
    
    if (!FLICKR_API_KEY) {
      console.log('No Flickr API key found in environment variables');
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
            message: 'Flickr API key not configured. Please set FLICKR_API_KEY in your environment variables.'
          }
        })
      };
    }

    // Flickr API 호출
    const params = new URLSearchParams({
      method: 'flickr.photos.search',
      api_key: FLICKR_API_KEY,
      text: query.trim(),
      page: page.toString(),
      per_page: Math.min(per_page, 500).toString(), // Flickr max is 500
      format: 'json',
      nojsoncallback: '1',
      safe_search: '1', // Safe content
      content_type: '1', // Photos only
      license: '1,2,3,4,5,6,7,8,9,10', // Creative Commons licenses
      extras: 'description,license,owner_name,url_l,url_o,url_m,url_s'
    });
    
    const searchUrl = `https://api.flickr.com/services/rest/?${params}`;

    console.log('Calling Flickr API...');
    
    const response = await fetch(searchUrl);
    
    console.log('Flickr API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Flickr API error:', response.status, errorText);
      throw new Error(`Flickr API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.stat !== 'ok') {
      throw new Error(`Flickr API error: ${data.message}`);
    }

    console.log('Flickr API response:', { 
      total: data.photos.total,
      pages: data.photos.pages,
      photos: data.photos.photo?.length 
    });

    // 라이선스 매핑
    const licenseMap = {
      '0': 'All Rights Reserved',
      '1': 'CC BY-NC-SA 2.0',
      '2': 'CC BY-NC 2.0',
      '3': 'CC BY-NC-ND 2.0',
      '4': 'CC BY 2.0',
      '5': 'CC BY-SA 2.0',
      '6': 'CC BY-ND 2.0',
      '7': 'No known copyright',
      '8': 'United States Government Work',
      '9': 'CC0 1.0',
      '10': 'Public Domain Mark 1.0'
    };

    // 결과 포맷팅
    const results = data.photos.photo?.map(photo => {
      // Flickr 이미지 URL 생성
      const baseUrl = `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}`;
      
      return {
        id: `flickr_${photo.id}`,
        title: photo.title || 'Flickr Photo',
        description: photo.description?._content || `Photo by ${photo.ownername}`,
        image: photo.url_l || `${baseUrl}_b.jpg`, // Large
        thumbnail: photo.url_m || `${baseUrl}_m.jpg`, // Medium
        original: photo.url_o || photo.url_l || `${baseUrl}_b.jpg`,
        url: `https://www.flickr.com/photos/${photo.owner}/${photo.id}`,
        width: photo.width_l || photo.width_o,
        height: photo.height_l || photo.height_o,
        user: photo.ownername,
        source: 'flickr',
        sourceLabel: 'Flickr',
        license: licenseMap[photo.license] || 'Unknown',
        attribution: {
          photographer: photo.ownername,
          flickrUrl: `https://www.flickr.com/photos/${photo.owner}/${photo.id}`
        }
      };
    }) || [];

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
          total: parseInt(data.photos.total) || 0,
          totalPages: data.photos.pages || 0,
          currentPage: data.photos.page || page
        }
      })
    };

  } catch (error) {
    console.error('Flickr search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Flickr search failed',
        message: error.message
      })
    };
  }
};