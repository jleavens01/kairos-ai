// Europeana API - 유럽 문화유산 자료
// 5천만 개 이상의 박물관, 도서관 소장품

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

    // Europeana API 키 확인
    const EUROPEANA_API_KEY = process.env.EUROPEANA_API_KEY;
    
    console.log('Europeana API check:');
    console.log('- API key exists:', !!EUROPEANA_API_KEY);
    console.log('- Search query:', query);
    
    if (!EUROPEANA_API_KEY) {
      console.log('No Europeana API key found');
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
            message: 'Europeana API key not configured. Get one at https://pro.europeana.eu/page/get-api'
          }
        })
      };
    }

    // Europeana API 호출
    const start = (page - 1) * per_page + 1;
    const params = new URLSearchParams({
      wskey: EUROPEANA_API_KEY,
      query: query.trim(),
      start: start.toString(),
      rows: Math.min(per_page, 100).toString(),
      profile: 'standard',
      media: 'true', // 이미지가 있는 항목만
      thumbnail: 'true',
      reusability: 'open,restricted' // 재사용 가능한 라이선스
    });
    
    const searchUrl = `https://api.europeana.eu/record/v2/search.json?${params}`;

    console.log('Calling Europeana API...');
    
    const response = await fetch(searchUrl);
    
    console.log('Europeana API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Europeana API error:', response.status, errorText);
      throw new Error(`Europeana API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Europeana API response:', { 
      totalResults: data.totalResults,
      itemsCount: data.itemsCount,
      items: data.items?.length 
    });

    // 결과 포맷팅
    const results = data.items?.map(item => {
      // 이미지 URL 추출
      const thumbnailUrl = item.edmPreview?.[0] || 
                          (item.edmIsShownBy ? item.edmIsShownBy[0] : null) ||
                          (item.edmObject ? item.edmObject[0] : null);
      
      // 원본 이미지 URL
      const originalUrl = item.edmIsShownBy?.[0] || item.edmObject?.[0] || thumbnailUrl;
      
      // 제목 추출
      const title = item.title?.[0] || 
                   item.dcTitleLangAware?.en?.[0] || 
                   item.dcTitleLangAware?.def?.[0] || 
                   'Untitled';
      
      // 설명 추출
      const description = item.dcDescriptionLangAware?.en?.[0] || 
                         item.dcDescriptionLangAware?.def?.[0] ||
                         item.dcDescription?.[0] ||
                         '';
      
      // 제작자/기관 정보
      const creator = item.dcCreator?.[0] || item.dataProvider?.[0] || 'Unknown';
      
      // 날짜 정보
      const date = item.year?.[0] || item.dcDate?.[0] || '';
      
      // 권리 정보
      const rights = item.rights?.[0] || '';
      
      return {
        id: `europeana_${item.id}`,
        title: title,
        description: description || `${creator}${date ? ', ' + date : ''}`,
        image: thumbnailUrl,
        thumbnail: thumbnailUrl,
        original: originalUrl,
        url: item.guid || `https://www.europeana.eu/item${item.id}`,
        creator: creator,
        date: date,
        source: 'europeana',
        sourceLabel: 'Europeana',
        license: rights,
        provider: item.dataProvider?.[0] || '',
        country: item.country?.[0] || '',
        type: item.type || 'IMAGE'
      };
    }).filter(item => item.image) || []; // 이미지가 있는 항목만

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
          total: data.totalResults || 0,
          totalPages: Math.ceil((data.totalResults || 0) / per_page),
          currentPage: page
        }
      })
    };

  } catch (error) {
    console.error('Europeana search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Europeana search failed',
        message: error.message
      })
    };
  }
};