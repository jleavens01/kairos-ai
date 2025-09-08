// Wikimedia Commons API를 활용한 역사적 이미지 검색
// 퍼블릭 도메인 및 자유 라이선스 이미지

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

    console.log('Wikimedia Commons search:');
    console.log('- Search query:', query);
    console.log('- Page:', page);

    // Wikimedia Commons는 API 키가 필요없음
    // offset 계산
    const offset = (page - 1) * per_page;

    // Wikimedia Commons API 호출
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query.trim(),
      gsrnamespace: '6', // File namespace
      gsrlimit: per_page.toString(),
      gsroffset: offset.toString(),
      prop: 'imageinfo|info',
      iiprop: 'timestamp|user|url|size|mime|extmetadata',
      iiurlwidth: '640', // Thumbnail width
      origin: '*'
    });
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?${params}`;

    console.log('Calling Wikimedia Commons API...');
    
    const response = await fetch(searchUrl);
    
    console.log('Wikimedia Commons API Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Wikimedia Commons API error: ${response.status}`);
    }

    const data = await response.json();
    
    // 결과 포맷팅
    const results = [];
    
    if (data.query && data.query.pages) {
      Object.values(data.query.pages).forEach(page => {
        if (page.imageinfo && page.imageinfo[0]) {
          const info = page.imageinfo[0];
          const metadata = info.extmetadata || {};
          
          // 라이선스 정보 추출
          let license = 'Unknown';
          if (metadata.LicenseShortName) {
            license = metadata.LicenseShortName.value;
          } else if (metadata.License) {
            license = metadata.License.value;
          }
          
          // 설명 추출
          let description = page.title.replace('File:', '');
          if (metadata.ImageDescription) {
            // HTML 태그 제거
            description = metadata.ImageDescription.value.replace(/<[^>]*>/g, '');
          }
          
          // 작가 정보
          let artist = info.user;
          if (metadata.Artist) {
            artist = metadata.Artist.value.replace(/<[^>]*>/g, '');
          }
          
          // 날짜 정보
          let dateOriginal = '';
          if (metadata.DateTimeOriginal) {
            dateOriginal = metadata.DateTimeOriginal.value;
          } else if (metadata.DateTime) {
            dateOriginal = metadata.DateTime.value;
          }
          
          results.push({
            id: `commons_${page.pageid}`,
            title: page.title.replace('File:', '').replace(/\.[^.]+$/, ''),
            description: description,
            image: info.thumburl || info.url,
            thumbnail: info.thumburl || info.url,
            original: info.url,
            url: info.descriptionurl,
            width: info.width,
            height: info.height,
            size: info.size,
            mime: info.mime,
            user: artist,
            source: 'wikimedia_commons',
            sourceLabel: 'Commons',
            license: license,
            dateOriginal: dateOriginal,
            attribution: {
              artist: artist,
              license: license,
              commonsUrl: info.descriptionurl
            }
          });
        }
      });
    }

    // 전체 결과 수를 얻기 위한 추가 쿼리
    const countParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'search',
      srsearch: query.trim(),
      srnamespace: '6',
      srlimit: '1',
      origin: '*'
    });
    
    const countUrl = `https://commons.wikimedia.org/w/api.php?${countParams}`;
    const countResponse = await fetch(countUrl);
    const countData = await countResponse.json();
    
    const totalHits = countData.query?.searchinfo?.totalhits || results.length;

    console.log('Wikimedia Commons results:', { 
      total: totalHits,
      returned: results.length 
    });

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
          total: totalHits,
          totalPages: Math.ceil(totalHits / per_page),
          currentPage: page
        }
      })
    };

  } catch (error) {
    console.error('Wikimedia Commons search error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Wikimedia Commons search failed',
        message: error.message
      })
    };
  }
};