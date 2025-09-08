// Metropolitan Museum of Art API
// 40만 개 이상의 고해상도 예술 작품 이미지 (완전 무료, API 키 불필요)

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

    console.log('Met Museum search:');
    console.log('- Search query:', query);
    console.log('- Page:', page);

    // Met Museum API는 API 키가 필요없음
    // 먼저 검색 쿼리로 객체 ID들을 가져옴
    const searchParams = new URLSearchParams({
      q: query.trim(),
      hasImages: 'true' // 이미지가 있는 작품만
    });
    
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?${searchParams}`;

    console.log('Calling Met Museum Search API...');
    
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      // 검색 결과가 없는 경우
      if (searchResponse.status === 404) {
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
              currentPage: page
            }
          })
        };
      }
      throw new Error(`Met Museum API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
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
            currentPage: page
          }
        })
      };
    }

    console.log('Met Museum search found:', searchData.total, 'objects');

    // 페이지네이션 계산
    const start = (page - 1) * per_page;
    const end = start + per_page;
    const pageObjectIds = searchData.objectIDs.slice(start, end);

    // 각 객체의 상세 정보를 가져옴
    const results = [];
    
    for (const objectId of pageObjectIds) {
      try {
        const objectUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`;
        const objectResponse = await fetch(objectUrl);
        
        if (objectResponse.ok) {
          const object = await objectResponse.json();
          
          // 이미지가 있는 경우만 포함
          if (object.primaryImage || object.primaryImageSmall) {
            results.push({
              id: `met_${object.objectID}`,
              title: object.title || 'Untitled',
              description: [
                object.artistDisplayName,
                object.objectDate,
                object.medium,
                object.department
              ].filter(Boolean).join(' | '),
              image: object.primaryImage || object.primaryImageSmall,
              thumbnail: object.primaryImageSmall || object.primaryImage,
              original: object.primaryImage || object.primaryImageSmall,
              url: object.objectURL || `https://www.metmuseum.org/art/collection/search/${object.objectID}`,
              artist: object.artistDisplayName || 'Unknown',
              date: object.objectDate || '',
              medium: object.medium || '',
              department: object.department || '',
              culture: object.culture || '',
              period: object.period || '',
              dynasty: object.dynasty || '',
              source: 'met',
              sourceLabel: 'Met Museum',
              license: object.isPublicDomain ? 'Public Domain' : 'Copyright',
              isPublicDomain: object.isPublicDomain,
              creditLine: object.creditLine || '',
              dimensions: object.dimensions || ''
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching object ${objectId}:`, err);
      }
    }

    console.log('Met Museum results processed:', results.length);

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
          total: searchData.total || 0,
          totalPages: Math.ceil((searchData.total || 0) / per_page),
          currentPage: page
        }
      })
    };

  } catch (error) {
    console.error('Met Museum search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Met Museum search failed',
        message: error.message
      })
    };
  }
};