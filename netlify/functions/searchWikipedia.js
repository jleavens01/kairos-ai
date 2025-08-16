// Wikipedia API 검색 서비스
// Wikipedia OpenSearch API와 Extract API를 활용하여 레퍼런스 자료 검색

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { query, language = 'ko', limit = 10 } = JSON.parse(event.body);

    if (!query || query.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Search query is required' })
      };
    }

    // 1. Wikipedia OpenSearch API로 페이지 제목 검색
    const searchUrl = `https://${language}.wikipedia.org/w/api.php?` + 
      new URLSearchParams({
        action: 'opensearch',
        search: query.trim(),
        limit: limit.toString(),
        namespace: '0',
        format: 'json'
      });

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error('Wikipedia search failed');
    }

    const searchData = await searchResponse.json();
    const [searchTerm, titles, descriptions, urls] = searchData;

    if (!titles || titles.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            query: searchTerm,
            results: []
          }
        })
      };
    }

    // 2. 각 페이지의 상세 정보, 이미지, 추출문 가져오기
    const pageResults = await Promise.all(
      titles.slice(0, 5).map(async (title, index) => {
        try {
          // 페이지 정보와 이미지 가져오기
          const pageUrl = `https://${language}.wikipedia.org/w/api.php?` + 
            new URLSearchParams({
              action: 'query',
              titles: title,
              prop: 'extracts|pageimages|info',
              format: 'json',
              exintro: 'true',
              explaintext: 'true',
              exsectionformat: 'plain',
              piprop: 'original',
              inprop: 'url'
            });

          const pageResponse = await fetch(pageUrl);
          if (!pageResponse.ok) {
            throw new Error(`Failed to fetch page data for ${title}`);
          }

          const pageData = await pageResponse.json();
          const pages = pageData.query?.pages;
          
          if (!pages) {
            return null;
          }

          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];

          // 페이지가 존재하지 않는 경우 스킵
          if (pageId === '-1' || !page) {
            return null;
          }

          return {
            id: pageId,
            title: page.title,
            description: descriptions[index] || '',
            extract: page.extract || '',
            url: page.fullurl || urls[index],
            image: page.original?.source || null,
            thumbnail: page.thumbnail?.source || null,
            source: 'wikipedia',
            language: language
          };
        } catch (error) {
          console.error(`Error fetching page data for ${title}:`, error);
          return null;
        }
      })
    );

    // null 결과 필터링
    const validResults = pageResults.filter(result => result !== null);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          query: searchTerm,
          results: validResults
        }
      })
    };

  } catch (error) {
    console.error('Wikipedia search error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Wikipedia search failed',
        message: error.message
      })
    };
  }
};