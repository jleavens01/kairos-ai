// 유튜브 트렌드 및 인기 검색어 수집
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;

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
    const { regionCode = 'KR', categoryId = '0' } = JSON.parse(event.body || '{}');
    
    console.log('유튜브 트렌드 조회:', { regionCode, categoryId });
    
    // 유튜브 인기 동영상 가져오기
    const trendingVideos = await fetchYoutubeTrending(regionCode, categoryId);
    
    // 트렌드 키워드 추출
    const trendKeywords = extractTrendKeywords(trendingVideos);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          videos: trendingVideos,
          keywords: trendKeywords
        }
      })
    };
    
  } catch (error) {
    console.error('유튜브 트렌드 조회 실패:', error);
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

// 유튜브 인기 동영상 가져오기
async function fetchYoutubeTrending(regionCode, categoryId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=50&key=${YOUTUBE_API_KEY}`;
  
  console.log('유튜브 API 호출 중... API 키:', YOUTUBE_API_KEY ? `${YOUTUBE_API_KEY.substring(0, 10)}...` : '없음');
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('유튜브 API 오류:', response.status);
      
      // 403 에러일 경우 상세 확인
      if (response.status === 403) {
        const errorData = await response.json();
        console.error('API 권한 오류:', errorData.error?.message);
        
        // API가 아직 활성화 안됐거나 키 문제일 경우 샘플 데이터
        if (errorData.error?.errors?.[0]?.reason === 'accessNotConfigured') {
          console.log('YouTube API가 아직 활성화되지 않았습니다. 샘플 데이터를 사용합니다.');
          return generateSampleYoutubeData();
        }
      }
      
      // 기타 오류 시에도 샘플 데이터
      console.log('API 오류로 샘플 데이터를 사용합니다.');
      return generateSampleYoutubeData();
    }
    
    const data = await response.json();
    
    console.log(`유튜브 실제 데이터 ${data.items?.length || 0}개 가져옴`);
    
    // 실제 비디오 데이터 처리
    return data.items.map(item => ({
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,  // channel → channelTitle로 수정
      channel: item.snippet.channelTitle,
      views: parseInt(item.statistics?.viewCount || 0),
      likes: parseInt(item.statistics?.likeCount || 0),
      publishedAt: item.snippet.publishedAt,
      tags: item.snippet.tags || [],
      categoryId: item.snippet.categoryId,
      videoId: item.id,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      description: item.snippet.description?.substring(0, 200)
    }));
    
  } catch (error) {
    console.error('유튜브 API 호출 실패:', error);
    return generateSampleYoutubeData();
  }
}

// 트렌드 키워드 추출
function extractTrendKeywords(videos) {
  const keywordMap = new Map();
  
  videos.forEach(video => {
    // 제목에서 키워드 추출
    const titleWords = extractKeywordsFromText(video.title);
    titleWords.forEach(word => {
      if (word.length > 1) {
        keywordMap.set(word, (keywordMap.get(word) || 0) + video.views);
      }
    });
    
    // 태그에서 키워드 추출
    if (video.tags) {
      video.tags.forEach(tag => {
        keywordMap.set(tag, (keywordMap.get(tag) || 0) + video.views);
      });
    }
  });
  
  // 상위 키워드 정렬
  const sortedKeywords = Array.from(keywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([keyword, score]) => ({
      keyword,
      score,
      trend: score > 10000000 ? 'viral' : score > 1000000 ? 'hot' : 'rising'
    }));
  
  return sortedKeywords;
}

// 텍스트에서 키워드 추출
function extractKeywordsFromText(text) {
  // 브랜드명 추출을 위한 패턴
  const brandPatterns = [
    '삼성', '애플', '아이폰', '갤럭시', 'LG', '현대', '기아',
    '나이키', '아디다스', '샤넬', '루이비통', '구찌',
    '스타벅스', '맥도날드', '코카콜라', '펩시',
    'BTS', '블랙핑크', '뉴진스', '세븐틴'
  ];
  
  const keywords = [];
  
  // 브랜드명 체크
  brandPatterns.forEach(brand => {
    if (text.includes(brand)) {
      keywords.push(brand);
    }
  });
  
  // 일반 키워드 추출 (간단한 방식)
  const words = text.split(/[\s,.\-!?]+/);
  words.forEach(word => {
    if (word.length > 2 && !keywords.includes(word)) {
      keywords.push(word);
    }
  });
  
  return keywords;
}

// 샘플 유튜브 데이터 생성
function generateSampleYoutubeData() {
  const sampleTitles = [
    '애플 아이폰 16 프로 언박싱 & 첫인상!',
    '삼성 갤럭시 S25 울트라 vs 애플 아이폰 16 프로 비교',
    '스타벅스 신메뉴 전메뉴 리뷰',
    '나이키 에어맥스 2025 신상 리뷰',
    '샤넬 클래식백 구매 후기',
    '디즈니 플러스 신작 드라마 리뷰',
    '테슬라 사이버트럭 시승기',
    '맥도날드 신메뉴 먹방',
    '넷플릭스 오리지널 시리즈 추천',
    'LG 올레드 TV 2025년형 리뷰',
    '구글 픽셀 9 프로 리뷰',
    '소니 플레이스테이션 5 프로 언박싱',
    '아디다스 이지 부스트 신상',
    '코카콜라 제로 vs 펩시 제로',
    'BMW M4 시승기',
    '마이크로소프트 서피스 프로 10',
    '아마존 프라임 데이 베스트 아이템',
    '페라리 신차 공개',
    '람보르기니 우라칸 리뷰',
    '메르세데스 벤츠 EQS 전기차'
  ];
  
  return sampleTitles.map((title, index) => ({
    title,
    channel: `인기 채널 ${index + 1}`,
    views: Math.floor(Math.random() * 5000000) + 100000,
    likes: Math.floor(Math.random() * 100000) + 1000,
    publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: extractKeywordsFromText(title),
    categoryId: '22',
    isSimulated: true
  }));
}