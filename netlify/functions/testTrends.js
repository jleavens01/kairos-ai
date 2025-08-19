// 트렌드 테스트 함수
import * as cheerio from 'cheerio';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('테스트 시작...');
    
    // 테스트 1: 간단한 네이버 검색
    const testQuery = '삼성 갤럭시';
    const searchUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(testQuery)}`;
    
    console.log('검색 URL:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      }
    });
    
    console.log('응답 상태:', response.status);
    console.log('응답 헤더:', response.headers);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('HTML 길이:', html.length);
    
    // HTML에서 검색 결과 수 찾기
    const $ = cheerio.load(html);
    
    // 여러 가지 방법으로 검색 결과 수 찾기
    let searchCount = 0;
    
    // 방법 1: 검색 결과 텍스트에서 찾기
    const searchResultText = $('body').text();
    const matches = searchResultText.match(/약\s*([\d,]+)\s*건|검색결과\s*([\d,]+)/);
    if (matches) {
      const numberStr = matches[1] || matches[2];
      searchCount = parseInt(numberStr.replace(/,/g, ''), 10);
      console.log('방법 1로 찾은 검색 결과 수:', searchCount);
    }
    
    // 방법 2: 특정 클래스나 ID로 찾기
    const resultInfo = $('.api_title_desc, .search_info, .num_result').text();
    console.log('결과 정보 텍스트:', resultInfo);
    
    // 방법 3: 검색 결과 아이템 수 세기
    const searchItems = $('.lst_total li, .api_ani_send, .group_news').length;
    console.log('검색 아이템 수:', searchItems);
    
    // 타이틀 확인
    const title = $('title').text();
    console.log('페이지 타이틀:', title);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query: testQuery,
        searchCount: searchCount || searchItems * 1000,
        title: title,
        htmlLength: html.length,
        hasContent: html.includes('검색') || html.includes('search')
      })
    };
    
  } catch (error) {
    console.error('테스트 실패:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};