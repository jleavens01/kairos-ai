// 네이버 데이터랩 API를 통한 실제 트렌드 수집
import crypto from 'crypto';

// 네이버 API 인증 정보
const CLIENT_ID = process.env.NAVER_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { keywords = [], startDate, endDate } = JSON.parse(event.body || '{}');
    
    // 기본 날짜 설정 (최근 1개월)
    const end = endDate || new Date().toISOString().slice(0, 10);
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    console.log('네이버 데이터랩 트렌드 조회:', { keywords, start, end });
    
    // 네이버 데이터랩 API 호출
    const trendData = await fetchNaverDataLab(keywords, start, end);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: trendData
      })
    };
    
  } catch (error) {
    console.error('네이버 트렌드 조회 실패:', error);
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

// 네이버 데이터랩 API 호출
async function fetchNaverDataLab(keywords, startDate, endDate) {
  const url = 'https://openapi.naver.com/v1/datalab/search';
  
  // 키워드 그룹 생성 (최대 5개 그룹, 각 그룹당 최대 20개 키워드)
  const keywordGroups = keywords.slice(0, 5).map(keyword => ({
    groupName: keyword,
    keywords: [keyword]
  }));
  
  const requestBody = {
    startDate: startDate,
    endDate: endDate,
    timeUnit: 'date',
    keywordGroups: keywordGroups,
    device: 'pc',
    ages: ['1', '2', '3', '4', '5', '6'],
    gender: ''
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('네이버 API 오류:', errorText);
      
      // API 키가 설정되지 않은 경우 샘플 데이터 반환
      if (CLIENT_ID === 'YOUR_CLIENT_ID') {
        return generateSampleDataLabData(keywords);
      }
      
      throw new Error(`네이버 API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    return processDataLabResults(data);
    
  } catch (error) {
    console.error('네이버 데이터랩 API 호출 실패:', error);
    // 실패 시 샘플 데이터 반환
    return generateSampleDataLabData(keywords);
  }
}

// 데이터랩 결과 처리
function processDataLabResults(data) {
  const processedResults = [];
  
  if (data.results) {
    data.results.forEach(result => {
      const groupName = result.title;
      const latestData = result.data[result.data.length - 1] || {};
      const previousData = result.data[result.data.length - 8] || {};
      
      // 트렌드 변화율 계산
      const changeRate = previousData.ratio ? 
        Math.round(((latestData.ratio - previousData.ratio) / previousData.ratio) * 100) : 0;
      
      processedResults.push({
        keyword: groupName,
        searchVolume: Math.round(latestData.ratio * 1000), // 상대값을 절대값으로 변환
        changeRate: changeRate,
        trend: changeRate > 20 ? 'hot' : changeRate > 0 ? 'rising' : changeRate < -20 ? 'falling' : 'steady',
        period: result.period
      });
    });
  }
  
  return processedResults;
}

// 샘플 데이터 생성 (API 키가 없을 때)
function generateSampleDataLabData(keywords) {
  return keywords.map(keyword => {
    const baseVolume = Math.floor(Math.random() * 100000) + 10000;
    const changeRate = Math.floor(Math.random() * 200) - 50;
    
    return {
      keyword: keyword,
      searchVolume: baseVolume,
      changeRate: changeRate,
      trend: changeRate > 20 ? 'hot' : changeRate > 0 ? 'rising' : changeRate < -20 ? 'falling' : 'steady',
      period: '최근 30일',
      isSimulated: true
    };
  });
}