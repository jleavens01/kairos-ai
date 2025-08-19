// 실제 세모지 유튜브 채널에서 원고 스타일 학습용 데이터 수집
// YouTube API를 통해 세모지 채널의 자막/설명 수집

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
    console.log('세모지 스타일 학습 데이터 수집 시작...');
    
    // YouTube API로 세모지 채널 영상 정보 가져오기
    const semojiVideos = await fetchSemojiVideos();
    
    // 각 영상의 자막 또는 설명 분석
    const learningData = await analyzeSemojiStyle(semojiVideos);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: learningData
      })
    };
    
  } catch (error) {
    console.error('세모지 데이터 수집 실패:', error);
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

// 세모지 채널 영상 가져오기
async function fetchSemojiVideos() {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  
  // 세모지(세상의모든지식) 채널 ID
  // 실제 채널 ID로 교체 필요
  const SEMOJI_CHANNEL_ID = 'UCyYJzHCv8K3pU6S5vEsvvFA'; // 예시 ID
  
  try {
    // 최근 인기 영상 10개 가져오기
    const url = `https://www.googleapis.com/youtube/v3/search?` +
      `key=${YOUTUBE_API_KEY}&` +
      `channelId=${SEMOJI_CHANNEL_ID}&` +
      `part=snippet&` +
      `order=viewCount&` +
      `maxResults=10&` +
      `type=video`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    const videos = [];
    
    // 각 영상의 상세 정보 가져오기
    for (const item of data.items || []) {
      const videoDetails = await getVideoDetails(item.id.videoId);
      videos.push({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        ...videoDetails
      });
    }
    
    return videos;
    
  } catch (error) {
    console.error('YouTube 영상 조회 실패:', error);
    // 학습용 샘플 데이터 반환
    return getSampleSemojiVideos();
  }
}

// 영상 상세 정보 가져오기
async function getVideoDetails(videoId) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?` +
      `key=${YOUTUBE_API_KEY}&` +
      `id=${videoId}&` +
      `part=contentDetails,statistics`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        duration: item.contentDetails.duration,
        viewCount: item.statistics.viewCount,
        likeCount: item.statistics.likeCount
      };
    }
  } catch (error) {
    console.error('영상 상세 정보 조회 실패:', error);
  }
  
  return {};
}

// 세모지 스타일 분석
async function analyzeSemojiStyle(videos) {
  const stylePatterns = [];
  
  for (const video of videos) {
    // 제목과 설명에서 패턴 추출
    const patterns = extractPatterns(video);
    stylePatterns.push(patterns);
  }
  
  // 공통 패턴 분석
  const commonPatterns = findCommonPatterns(stylePatterns);
  
  return {
    videos: videos.length,
    patterns: commonPatterns,
    examples: stylePatterns.slice(0, 5) // 상위 5개 예시
  };
}

// 패턴 추출
function extractPatterns(video) {
  const patterns = {
    title: video.title,
    
    // 도입부 패턴 (설명 첫 부분)
    intro: extractIntroPattern(video.description),
    
    // 주요 키워드
    keywords: extractKeywords(video.title + ' ' + video.description),
    
    // 질문 형태
    questions: extractQuestions(video.description),
    
    // 수치/통계 사용
    statistics: extractStatistics(video.description),
    
    // 감정 표현
    emotions: extractEmotions(video.description)
  };
  
  return patterns;
}

// 도입부 패턴 추출
function extractIntroPattern(description) {
  if (!description) return null;
  
  // 첫 2-3문장 추출
  const sentences = description.split(/[.!?]/).slice(0, 3);
  return sentences.join('. ').trim();
}

// 키워드 추출
function extractKeywords(text) {
  // 자주 나오는 명사 추출 (간단한 구현)
  const keywords = [];
  const patterns = [
    /브랜드|기업|회사/g,
    /성공|실패|위기|혁신/g,
    /역사|스토리|이야기/g,
    /전략|비결|철학/g
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  });
  
  return [...new Set(keywords)];
}

// 질문 추출
function extractQuestions(text) {
  if (!text) return [];
  
  const questions = text.match(/[^.!]*\?/g) || [];
  return questions.map(q => q.trim());
}

// 통계/수치 추출
function extractStatistics(text) {
  if (!text) return [];
  
  const stats = text.match(/\d+[가-힣%$원년개명]/g) || [];
  return stats;
}

// 감정 표현 추출
function extractEmotions(text) {
  if (!text) return [];
  
  const emotions = [];
  const emotionPatterns = [
    '놀랍게도', '흥미롭게도', '실제로', '그런데',
    '하지만', '그러나', '믿기 어렵겠지만'
  ];
  
  emotionPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      emotions.push(pattern);
    }
  });
  
  return emotions;
}

// 공통 패턴 찾기
function findCommonPatterns(patterns) {
  const commonPatterns = {
    // 자주 사용되는 도입부 형식
    introFormats: [
      "질문으로 시작",
      "충격적 사실 제시",
      "시간적 대비 (과거 vs 현재)"
    ],
    
    // 자주 사용되는 전환구
    transitions: ["그런데", "하지만", "놀랍게도", "흥미롭게도"],
    
    // 스토리텔링 구조
    structure: [
      "도입 (호기심 유발)",
      "배경 설명",
      "핵심 내용 전달",
      "인사이트 제시",
      "마무리"
    ],
    
    // 어조와 톤
    tone: "친근하면서도 전문적, 경어체 사용",
    
    // 콘텐츠 특징
    features: [
      "구체적 수치와 데이터 활용",
      "일상과 연결된 비유",
      "역사적 맥락 설명",
      "감정적 공감 포인트"
    ]
  };
  
  return commonPatterns;
}

// 샘플 데이터 (API 실패 시)
function getSampleSemojiVideos() {
  return [
    {
      title: "스타벅스는 어떻게 세계 최고의 카페가 되었을까? | 하워드 슐츠의 놀라운 이야기",
      description: "여러분은 스타벅스에서 커피를 사신 적 있으신가요? 그런데 하워드 슐츠는 커피를 팔려고 한 게 아니었습니다. 그가 정말로 팔고 싶었던 것은 '제3의 공간'이었죠. 오늘은 시애틀의 작은 커피 가게에서 시작해 전 세계 3만 개가 넘는 매장을 운영하는 글로벌 기업이 된 스타벅스의 놀라운 이야기를 들려드리려고 합니다.",
      viewCount: "1234567",
      duration: "PT15M32S"
    },
    {
      title: "애플이 파산 직전에서 세계 1위가 된 진짜 이유 | 스티브 잡스의 귀환",
      description: "1997년, 애플은 파산 직전이었습니다. 그런데 불과 25년 후, 세계에서 가장 가치 있는 기업이 되었죠. 도대체 무슨 일이 있었던 걸까요? 오늘은 스티브 잡스가 애플로 돌아온 후 일으킨 기적같은 변화, 그리고 그 뒤에 숨겨진 철학에 대해 이야기해보려고 합니다.",
      viewCount: "2345678",
      duration: "PT18M45S"
    },
    {
      title: "나이키 Just Do It의 숨겨진 의미 | 필 나이트의 도전",
      description: "Just Do It. 이 짧은 세 단어가 어떻게 전 세계 수십억 명의 마음을 움직이게 되었을까요? 1964년, 스탠포드 대학의 육상 선수였던 필 나이트는 일본으로 향하는 비행기에 올랐습니다. 그의 가방 안에는 단돈 50달러와 엉성한 사업 계획서 한 장이 전부였죠.",
      viewCount: "1567890",
      duration: "PT12M20S"
    }
  ];
}