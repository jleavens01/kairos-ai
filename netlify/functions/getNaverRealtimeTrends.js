// 네이버 데이터랩 실시간 급상승 검색어 수집
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('네이버 실시간 트렌드 조회 시작...');
    
    // 네이버 데이터랩 API로 실시간 인기 검색어 가져오기
    const trendingKeywords = await fetchNaverDataLabTrends();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: trendingKeywords
      })
    };
    
  } catch (error) {
    console.error('네이버 실시간 트렌드 조회 실패:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// 네이버 데이터랩으로 실시간 트렌드 가져오기
async function fetchNaverDataLabTrends() {
  // 인기 있는 주제들로 검색 트렌드 확인
  const popularTopics = [
    // 브랜드
    '삼성', '애플', 'LG', '현대', '기아', '나이키', '아디다스', '스타벅스', '맥도날드',
    // 테크
    '아이폰', '갤럭시', 'AI', '챗GPT', '테슬라', '구글', '넷플릭스',
    // 엔터테인먼트
    'BTS', '블랙핑크', '뉴진스', 'K팝', '드라마', '영화',
    // 경제
    '주식', '부동산', '코스피', '비트코인', '금리',
    // 사회
    '날씨', '코로나', '선거', '정치', '교육'
  ];
  
  // 최근 7일간 데이터로 트렌드 분석
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  try {
    // 여러 키워드 그룹으로 나누어 검색 (데이터랩 API는 한번에 5개 그룹까지)
    const allTrends = [];
    
    for (let i = 0; i < popularTopics.length; i += 5) {
      const batch = popularTopics.slice(i, i + 5);
      const trends = await fetchDataLabBatch(batch, startDate, endDate);
      allTrends.push(...trends);
    }
    
    // 검색량 변화율 기준으로 정렬
    allTrends.sort((a, b) => b.changeRate - a.changeRate);
    
    // 상위 20개 반환
    return allTrends.slice(0, 20);
    
  } catch (error) {
    console.error('데이터랩 트렌드 조회 실패:', error);
    // 에러 시 빈 배열 반환
    return [];
  }
}

// 네이버 데이터랩 API 배치 호출
async function fetchDataLabBatch(keywords, startDate, endDate) {
  const url = 'https://openapi.naver.com/v1/datalab/search';
  
  const requestBody = {
    startDate: startDate,
    endDate: endDate,
    timeUnit: 'date',
    keywordGroups: keywords.map(keyword => ({
      groupName: keyword,
      keywords: [keyword]
    })),
    device: '',
    ages: [],
    gender: ''
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`네이버 API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 각 키워드의 트렌드 계산
    const trends = [];
    
    if (data.results) {
      data.results.forEach(result => {
        const keyword = result.title;
        const dataPoints = result.data || [];
        
        if (dataPoints.length > 0) {
          // 최근 데이터와 일주일 전 데이터 비교
          const latestValue = dataPoints[dataPoints.length - 1]?.ratio || 0;
          const oldValue = dataPoints[0]?.ratio || 0;
          
          // 변화율 계산
          const changeRate = oldValue > 0 
            ? Math.round(((latestValue - oldValue) / oldValue) * 100)
            : 0;
          
          // 평균 검색량 계산
          const avgVolume = dataPoints.reduce((sum, p) => sum + (p.ratio || 0), 0) / dataPoints.length;
          
          trends.push({
            keyword: keyword,
            searchVolume: Math.round(avgVolume * 10000), // 상대값을 추정 절대값으로 변환
            changeRate: changeRate,
            trend: changeRate > 50 ? 'hot' : changeRate > 10 ? 'rising' : 'steady',
            category: detectCategory(keyword),
            timestamp: new Date().toISOString(),
            source: 'naver_datalab'
          });
        }
      });
    }
    
    return trends;
    
  } catch (error) {
    console.error('데이터랩 API 호출 실패:', error);
    return [];
  }
}

// 키워드 카테고리 감지
function detectCategory(keyword) {
  const categories = {
    '브랜드/기업': ['삼성', '애플', 'LG', '현대', '기아', '구글', '테슬라', '나이키', '아디다스', '스타벅스', '맥도날드'],
    'IT/테크': ['아이폰', '갤럭시', 'AI', '챗GPT', '인공지능', '스마트폰', '컴퓨터', '인터넷'],
    '엔터테인먼트': ['BTS', '블랙핑크', '뉴진스', 'K팝', '드라마', '영화', '넷플릭스', '유튜브'],
    '경제/금융': ['주식', '코스피', '코스닥', '부동산', '아파트', '비트코인', '금리', '투자'],
    '사회/생활': ['날씨', '코로나', '선거', '정치', '교육', '학교', '병원', '여행']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => keyword.includes(k))) {
      return category;
    }
  }
  
  return '일반';
}