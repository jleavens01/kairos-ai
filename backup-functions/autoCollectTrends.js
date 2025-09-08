// 자동 트렌드 수집 및 AI 분석 통합 함수
// YouTube 50개 + 네이버 트렌드를 자동 수집하고 AI가 분석하여 키워드 도출

// API 키는 GENERATIVE_LANGUAGE_API_KEY를 우선 사용 (작동 확인됨)
const GEMINI_API_KEY = process.env.GENERATIVE_LANGUAGE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

console.log('환경 변수 초기화 확인:', {
  GEMINI_API_KEY: GEMINI_API_KEY ? '설정됨' : '없음',
  YOUTUBE_API_KEY: YOUTUBE_API_KEY ? '설정됨' : '없음',
  NAVER_CLIENT_ID: NAVER_CLIENT_ID ? '설정됨' : '없음',
  NAVER_CLIENT_SECRET: NAVER_CLIENT_SECRET ? '설정됨' : '없음'
});

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
    console.log('자동 트렌드 수집 시작...');
    
    // 1. YouTube 인기 동영상 50개 수집
    const youtubeVideos = await collectYouTubeTrending();
    if (!youtubeVideos || youtubeVideos.length === 0) {
      throw new Error('YouTube API에서 데이터를 가져올 수 없습니다. API 키를 확인해주세요.');
    }
    console.log(`YouTube 동영상 ${youtubeVideos.length}개 수집 완료`);
    
    // 2. 네이버 쇼핑인사이트 수집
    const naverTrends = await collectNaverTrends();
    console.log(`네이버 쇼핑 트렌드 ${naverTrends.length}개 수집 완료`);
    
    // 최소한 YouTube 데이터가 있어야 분석 진행
    if (youtubeVideos.length === 0 && naverTrends.length === 0) {
      throw new Error('수집된 트렌드 데이터가 없습니다. API 설정을 확인해주세요.');
    }
    
    // 3. AI 분석으로 핵심 키워드 도출
    const aiAnalysis = await analyzeWithAI({
      youtube: youtubeVideos,
      naver: naverTrends
    });
    
    // 4. 브랜드별로 그룹화
    const brandGroups = groupByBrands(aiAnalysis.keywords);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          keywords: aiAnalysis.keywords,
          brands: brandGroups,
          trends: aiAnalysis.trends,
          insights: aiAnalysis.insights,
          topContent: {
            youtube: youtubeVideos.slice(0, 5),
            naver: naverTrends.slice(0, 5)
          },
          // 전체 YouTube 동영상 리스트 추가
          youtubeVideos: youtubeVideos.map(video => ({
            id: video.id,
            title: video.title,
            channel: video.channel,
            thumbnail: video.thumbnail,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            publishedAt: video.publishedAt
          })),
          // 전체 네이버 쇼핑 카테고리 리스트 추가
          naverCategories: naverTrends,
          statistics: {
            totalYoutubeViews: youtubeVideos.reduce((sum, v) => sum + v.viewCount, 0),
            totalVideos: youtubeVideos.length,
            totalNaverItems: naverTrends.length
          }
        }
      })
    };
    
  } catch (error) {
    console.error('자동 트렌드 수집 실패:', error);
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

// YouTube 인기 동영상 수집
async function collectYouTubeTrending() {
  console.log('YouTube API 키 확인:', YOUTUBE_API_KEY ? `${YOUTUBE_API_KEY.substring(0, 10)}...` : '없음');
  
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API 키가 설정되지 않았습니다.');
    return [];
  }
  
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&maxResults=50&key=${YOUTUBE_API_KEY}`;
  
  try {
    console.log('YouTube API 호출 URL:', url.replace(YOUTUBE_API_KEY, 'API_KEY_HIDDEN'));
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API 오류 응답:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 500)
      });
      
      // API 키 문제인지 확인
      if (response.status === 403 || response.status === 401) {
        console.error('YouTube API 키 인증 실패. API 키를 확인하세요.');
      }
      
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('YouTube API에서 데이터를 받았지만 비어있습니다.');
      return [];
    }
    
    console.log(`YouTube 실제 데이터 ${data.items.length}개 수집 성공`);
    console.log('첫 번째 비디오:', data.items[0]?.snippet?.title);
    
    return data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      description: video.snippet.description?.substring(0, 200),
      tags: video.snippet.tags || [],
      viewCount: parseInt(video.statistics?.viewCount || 0),
      likeCount: parseInt(video.statistics?.likeCount || 0),
      commentCount: parseInt(video.statistics?.commentCount || 0),
      publishedAt: video.snippet.publishedAt,
      categoryId: video.snippet.categoryId,
      thumbnail: video.snippet.thumbnails?.high?.url
    }));
    
  } catch (error) {
    console.error('YouTube 데이터 수집 실패:', error.message);
    console.error('에러 스택:', error.stack);
    return [];
  }
}

// 네이버 트렌드 수집 (쇼핑인사이트만 사용)
async function collectNaverTrends() {
  console.log('네이버 API 키 확인:', {
    clientId: NAVER_CLIENT_ID ? `${NAVER_CLIENT_ID.substring(0, 5)}...` : '없음',
    clientSecret: NAVER_CLIENT_SECRET ? '설정됨' : '없음'
  });
  
  // 쇼핑인사이트 데이터만 수집
  const shoppingTrends = await fetchNaverShoppingInsight();
  
  return shoppingTrends;
}


// AI 분석 수행
async function analyzeWithAI(data) {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API 키가 설정되지 않았습니다.');
    throw new Error('AI 분석을 위한 API 키가 설정되지 않았습니다.');
  }
  
  // 프롬프트를 간단하게 줄임
  const topVideos = data.youtube.slice(0, 15).map(v => v.title).join(', ');
  const shoppingCategories = data.naver.filter(n => n.type === 'shopping').map(n => `${n.keyword}(${n.trend})`).join(', ');
  
  const prompt = `현재 실시간 트렌드 데이터입니다:

YouTube 인기 동영상 TOP 15:
${topVideos}

쇼핑 카테고리 트렌드:
${shoppingCategories}

위 데이터에서 실제로 언급되거나 관련된 브랜드/키워드만 추출해주세요. 
고정 키워드나 일반적인 브랜드가 아닌, 실제 데이터에 나타난 트렌드만 분석해주세요.

JSON 형식:
{
  "keywords": [
    {"keyword": "브랜드명", "brand": "브랜드명", "trend": "viral|hot|rising|steady", "topic": "관련토픽"}
  ],
  "trends": {
    "tech": ["키워드1", "키워드2"],
    "fashion": ["키워드1", "키워드2"],
    "food": ["키워드1", "키워드2"],
    "entertainment": ["키워드1", "키워드2"]
  },
  "insights": [
    {"brand": "브랜드명", "story": "스토리", "interest": "높음|중간|보통"}
  ]
}
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,  // 더 긴 응답을 위해 증가
          responseMimeType: "application/json"
        }
      })
    });
    
    if (!response.ok) {
      console.error('Gemini API 오류:', response.status);
      throw new Error('AI 분석 API 호출 실패');
    }
    
    const result = await response.json();
    console.log('Gemini API 응답 구조:', JSON.stringify(result, null, 2).substring(0, 500));
    
    // 응답 구조 검증
    if (!result.candidates || !result.candidates[0]) {
      console.error('Gemini API 응답에 candidates가 없습니다:', result);
      throw new Error('AI 분석 응답 형식 오류');
    }
    
    if (!result.candidates[0].content || !result.candidates[0].content.parts) {
      console.error('Gemini API 응답에 content.parts가 없습니다:', result.candidates[0]);
      throw new Error('AI 분석 응답 내용 없음');
    }
    
    const analysisText = result.candidates[0].content.parts[0].text;
    
    try {
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.error('AI 응답 파싱 실패:', parseError);
      console.error('파싱 시도한 텍스트:', analysisText?.substring(0, 200));
      throw new Error('AI 분석 결과 파싱 실패');
    }
    
  } catch (error) {
    console.error('AI 분석 실패:', error);
    throw error;
  }
}

// 네이버 쇼핑인사이트 API 호출 (실제 트렌드 반영)
async function fetchNaverShoppingInsight() {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.log('네이버 API 키가 설정되지 않았습니다.');
    return [];
  }
  
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  const results = [];
  
  // 최대 3개까지만 가능 (API 제한)
  const categories = [
    { name: '패션의류', param: ['50000000'] },
    { name: '화장품/미용', param: ['50000002'] },
    { name: '디지털/가전', param: ['50000003'] }
  ];
  
  try {
    console.log('네이버 쇼핑 카테고리 트렌드 조회 (3개 카테고리)...');
    const requestBody = {
      startDate,
      endDate,
      timeUnit: 'date',
      category: categories  // 이미 올바른 형식
    };
    
    console.log('요청 본문:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://openapi.naver.com/v1/datalab/shopping/categories', {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('쇼핑 카테고리 응답:', data.results?.length || 0, '개');
      
      if (data.results) {
        data.results.forEach(result => {
          const dataPoints = result.data || [];
          if (dataPoints.length > 0) {
            const latestValue = dataPoints[dataPoints.length - 1]?.ratio || 0;
            const oldValue = dataPoints[Math.max(0, dataPoints.length - 7)]?.ratio || 0;
            const changeRate = oldValue > 0 ? ((latestValue - oldValue) / oldValue) * 100 : 0;
            
            results.push({
              type: 'shopping',
              keyword: result.title,
              category: result.title,
              searchVolume: Math.round(latestValue * 10000),
              changeRate: Math.round(changeRate),
              trend: changeRate > 30 ? 'hot' : changeRate > 10 ? 'rising' : 'steady',
              data: dataPoints // 차트용 데이터 포함
            });
          }
        });
      }
    } else {
      const errorText = await response.text();
      console.error('쇼핑 카테고리 API 오류:', response.status, errorText);
    }
  } catch (error) {
    console.error('쇼핑 카테고리 API 실패:', error.message);
  }
  
  console.log(`쇼핑인사이트 데이터 ${results.length}개 수집 완료`);
  return results;
}

// 브랜드별 그룹화
function groupByBrands(keywords) {
  const brandGroups = {};
  
  if (!keywords || !Array.isArray(keywords)) {
    return [];
  }
  
  // 각 키워드를 브랜드로 그룹화
  keywords.forEach((item, index) => {
    const brand = item.brand || item.keyword || 'Unknown';
    if (!brandGroups[brand]) {
      brandGroups[brand] = {
        brand,
        trend: item.trend || 'steady',
        topics: [],
        score: 0,
        count: 0
      };
    }
    
    if (item.topic) {
      brandGroups[brand].topics.push(item.topic);
    }
    
    brandGroups[brand].count++;
    
    // 트렌드별 기본 점수 (더 다양하게 설정)
    const trendScores = { 
      viral: 85 + Math.random() * 15,  // 85-100
      hot: 60 + Math.random() * 20,    // 60-80
      rising: 35 + Math.random() * 20, // 35-55
      steady: 15 + Math.random() * 15  // 15-30
    };
    
    const baseScore = trendScores[item.trend] || (10 + Math.random() * 10);
    const positionBonus = Math.max(0, (15 - index) * 1.5); // 상위 항목 보너스
    const randomFactor = Math.random() * 10 - 5; // ±5 랜덤 요소
    
    brandGroups[brand].score += baseScore + positionBonus + randomFactor;
  });
  
  // 평균 점수 계산하고 정규화
  Object.values(brandGroups).forEach(group => {
    // 평균 점수 계산
    group.score = Math.round(group.score / Math.max(1, group.count));
    
    // 점수 범위 제한 (10-100)
    group.score = Math.min(100, Math.max(10, group.score));
    
    // 중복 토픽 제거
    group.topics = [...new Set(group.topics)];
  });
  
  // 점수 순으로 정렬
  return Object.values(brandGroups).sort((a, b) => b.score - a.score);
}

