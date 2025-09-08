// DPLA (Digital Public Library of America) API
// 미국 역사 자료, 4천만 개 이상 아이템

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

    // DPLA API 키 확인
    const DPLA_API_KEY = process.env.DPLA_API_KEY;
    
    console.log('DPLA API check:');
    console.log('- API key exists:', !!DPLA_API_KEY);
    console.log('- Search query:', query);
    
    if (!DPLA_API_KEY) {
      console.log('No DPLA API key found');
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
            message: 'DPLA API key not configured. Get one at https://pro.dp.la/developers/api-key'
          }
        })
      };
    }

    // DPLA API 호출
    const params = new URLSearchParams({
      api_key: DPLA_API_KEY,
      q: query.trim(),
      page: page.toString(),
      page_size: Math.min(per_page, 500).toString()
    });
    
    const searchUrl = `https://api.dp.la/v2/items?${params}`;

    console.log('Calling DPLA API...');
    
    const response = await fetch(searchUrl);
    
    console.log('DPLA API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('DPLA API error:', response.status, errorText);
      console.error('Full error response:', errorText);
      throw new Error(`DPLA API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('DPLA API response:', { 
      count: data.count,
      docs: data.docs?.length 
    });

    // 결과 포맷팅
    const results = data.docs?.map(doc => {
      const sourceResource = doc.sourceResource || {};
      const originalRecord = doc.originalRecord || {};
      
      // 이미지 URL 추출 (object 필드에 이미지 URL이 있음)
      const imageUrl = doc.object || 
                      (Array.isArray(sourceResource.object) ? sourceResource.object[0] : sourceResource.object);
      
      if (!imageUrl) return null; // 이미지가 없으면 스킵
      
      // Calisphere 썸네일 URL은 스킵 (접근 불가능한 경우가 많음)
      if (imageUrl.includes('thumbnails.calisphere.org')) return null;
      
      // 제목
      const title = Array.isArray(sourceResource.title) 
        ? sourceResource.title[0] 
        : sourceResource.title || 'Untitled';
      
      // 설명
      const description = Array.isArray(sourceResource.description)
        ? sourceResource.description[0]
        : sourceResource.description || '';
      
      // 제작자
      const creator = Array.isArray(sourceResource.creator)
        ? sourceResource.creator.map(c => typeof c === 'object' ? c.name : c).join(', ')
        : sourceResource.creator || '';
      
      // 날짜
      const date = sourceResource.date?.displayDate || 
                  sourceResource.date?.begin || 
                  sourceResource.date?.end || '';
      
      // 제공 기관
      const provider = doc.dataProvider || doc.provider?.name || '';
      
      // 권리 정보
      const rights = sourceResource.rights || doc.rights || '';
      
      return {
        id: `dpla_${doc.id}`,
        title: title,
        description: description || `${creator}${date ? ', ' + date : ''}`,
        image: imageUrl,
        thumbnail: imageUrl,
        original: imageUrl,
        url: doc.isShownAt || `https://dp.la/item/${doc.id}`,
        creator: creator,
        date: date,
        source: 'dpla',
        sourceLabel: 'DPLA',
        license: rights,
        provider: provider,
        type: sourceResource.type || 'image',
        subject: Array.isArray(sourceResource.subject) 
          ? sourceResource.subject.map(s => typeof s === 'object' ? s.name : s).join(', ')
          : sourceResource.subject || ''
      };
    }).filter(item => item && item.image) || []; // 이미지가 있는 항목만

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
          total: data.count || 0,
          totalPages: Math.ceil((data.count || 0) / per_page),
          currentPage: page
        }
      })
    };

  } catch (error) {
    console.error('DPLA search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'DPLA search failed',
        message: error.message
      })
    };
  }
};