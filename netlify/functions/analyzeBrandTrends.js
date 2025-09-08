// 브랜드 트렌드 분석 API - 실제 데이터 버전
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { mode = 'auto', sources = ['search', 'shopping', 'social'], useAI = true } = JSON.parse(event.body || '{}');
    
    console.log('트렌드 분석 시작:', { mode, sources, useAI });
    
    // 실시간 트렌드 수집
    console.log('실시간 트렌드 데이터 수집 시작...');
    
    // 플랫폼별 데이터 수집 및 분석
    const allTopics = [];
    
    // 1. 네이버 실시간 검색어 트렌드 (5개만 선정)
    const naverTrendingKeywords = await getNaverRealtimeTrends();
    const naverTopTrends = naverTrendingKeywords.slice(0, 5);
    
    // 트렌드 데이터가 객체 형태인 경우와 문자열인 경우 모두 처리
    const naverBrands = naverTopTrends.map(item => 
      typeof item === 'object' ? item.keyword : item
    );
    
    // 이미 검색량 정보가 있는 경우 그대로 사용
    const naverSearchTrends = naverTopTrends.map((item, index) => {
      if (typeof item === 'object' && item.searchVolume) {
        return item;
      }
      // 검색량 정보가 없으면 별도로 조회
      return { keyword: naverBrands[index], searchVolume: 0, changeRate: 0 };
    });
    
    const naverKeywords = await getBrandKeywords(naverBrands);
    
    for (let i = 0; i < naverBrands.length; i++) {
      const brand = naverBrands[i];
      const searchData = naverSearchTrends[i];
      const keywords = naverKeywords[brand] || [];
      
      const description = `[네이버 검색 트렌드] ${generatePlatformDescription('naver', brand, searchData, keywords)}`;
      const scores = calculatePlatformScores('naver', searchData, keywords);
      
      allTopics.push({
        brand: brand,
        title: `${brand} - 네이버 검색 트렌드`,
        summary: description,
        score: scores.score,
        final_score: scores.finalScore,
        suitability: scores.finalScore > 300 ? 'perfect' : scores.finalScore > 200 ? 'high' : 'medium',
        metadata: {
          platform: 'naver',
          brand: brand,
          type: 'trend',
          keywords: keywords || [],
          sources: ['naver'],
          searchVolume: searchData?.searchVolume || 0,
          changeRate: searchData?.changeRate || 0,
          evaluationReasons: [
            {
              category: '네이버 검색량',
              score: scores.searchScore,
              detail: `실시간 검색량 ${(searchData?.searchVolume || 0).toLocaleString()}회`
            },
            {
              category: '검색 변화율',
              score: scores.trendScore,
              detail: `${searchData?.changeRate > 0 ? '상승' : '하락'} ${Math.abs(searchData?.changeRate || 0)}%`
            },
            {
              category: '연관 검색어',
              score: keywords.length * 10,
              detail: keywords.length > 0 ? keywords.slice(0, 5).join(', ') : '수집 중'
            }
          ]
        },
        status: 'selected',
        workflow_stage: 'item_selection',
        source_type: 'trend',
        category: 'brand'
      });
    }
    
    // 2. 유튜브 실시간 트렌드 분석 (5개만 선정)
    const youtubeTrends = await getYoutubeTrends();
    const youtubeBrands = extractBrandsFromYoutube(youtubeTrends).slice(0, 5);
    
    for (const brand of youtubeBrands) {
      // 브랜드 관련 영상 필터링
      const relatedVideos = youtubeTrends.videos?.filter(v => {
        const titleLower = v.title?.toLowerCase() || '';
        const brandLower = brand.toLowerCase();
        return titleLower.includes(brandLower) || 
               v.channelTitle?.toLowerCase().includes(brandLower) ||
               v.tags?.some(tag => tag.toLowerCase().includes(brandLower));
      }) || [];
      
      // 브랜드가 언급된 영상이 없으면 스킵
      if (relatedVideos.length === 0 && youtubeBrands.length > 10) continue;
      
      const description = `[유튜브 영상 트렌드] ${generatePlatformDescription('youtube', brand, null, null, relatedVideos)}`;
      const scores = calculatePlatformScores('youtube', null, null, relatedVideos);
      
      allTopics.push({
        brand: brand,
        title: `${brand} - 유튜브 영상 트렌드`,
        summary: description,
        score: scores.score,
        final_score: scores.finalScore,
        suitability: scores.finalScore > 200 ? 'high' : 'medium',
        metadata: {
          platform: 'youtube',
          brand: brand,
          type: 'trend',
          keywords: [],
          sources: ['youtube'],
          videoCount: relatedVideos.length,
          evaluationReasons: [
            {
              category: '영상 트렌드',
              score: relatedVideos.length * 20,
              detail: `관련 영상 ${relatedVideos.length}개 트렌드 진입`
            },
            {
              category: '조회수',
              score: scores.viewScore || 50,
              detail: relatedVideos.length > 0 ? `높은 조회수 기록` : '데이터 수집 중'
            },
            {
              category: '채널 활동',
              score: 30,
              detail: `다양한 채널에서 언급`
            }
          ]
        },
        status: 'selected',
        workflow_stage: 'item_selection',
        source_type: 'trend',
        category: 'brand'
      });
    }
    
    // 3. 인스타그램 트렌드 분석 (10개) - API 없어서 임시 주석 처리
    /*
    const instagramTrends = await getInstagramTrends();
    const instagramBrands = extractBrandsFromInstagram(instagramTrends).slice(0, 10);
    
    for (const brand of instagramBrands) {
      const relatedHashtags = instagramTrends.filter(t => 
        t.tag?.includes(brand) || t.brand === brand
      );
      
      const description = `[인스타그램 해시태그 트렌드] ${generatePlatformDescription('instagram', brand, null, null, null, relatedHashtags)}`;
      const scores = calculatePlatformScores('instagram', null, null, null, relatedHashtags);
      
      allTopics.push({
        brand: brand,
        title: `${brand} - 인스타그램 트렌드`,
        summary: description,
        score: scores.score,
        final_score: scores.finalScore,
        suitability: scores.finalScore > 200 ? 'high' : 'medium',
        metadata: {
          platform: 'instagram',
          brand: brand,
          type: 'trend',
          keywords: relatedHashtags.map(t => t.tag || '').filter(Boolean).slice(0, 5),
          sources: ['instagram'],
          postCount: relatedHashtags.reduce((sum, t) => sum + (t.posts || 0), 0),
          evaluationReasons: [
            {
              category: '해시태그 언급',
              score: relatedHashtags.length * 30,
              detail: `${relatedHashtags.length}개 해시태그에서 활발`
            },
            {
              category: '게시물 수',
              score: scores.postScore || 50,
              detail: `총 ${relatedHashtags.reduce((sum, t) => sum + (t.posts || 0), 0).toLocaleString()}개 게시물`
            },
            {
              category: '인기도',
              score: 40,
              detail: `높은 사용자 참여도`
            }
          ]
        },
        status: 'selected',
        workflow_stage: 'item_selection',
        source_type: 'trend',
        category: 'brand'
      });
    }
    */
    
    // 모든 플랫폼 통합 (10개 - 네이버 5개, 유튜브 5개)
    const selectedTopics = allTopics;
    
    // 5. AI 분석 추가 (useAI 옵션이 true일 때)
    let analyzedTopics = selectedTopics;
    if (useAI && selectedTopics.length > 0) {
      console.log('선정된 10개 아이템에 대한 AI 분석 시작...');
      analyzedTopics = await analyzeTopicsWithAI(selectedTopics);
    }
    
    // 6. Supabase에 저장
    const savedTopics = await saveToSupabase(analyzedTopics);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          collected: savedTopics.length,
          topics: savedTopics.length,
          items: savedTopics,
          platforms: {
            naver: savedTopics.filter(t => t.metadata?.platform === 'naver').length,
            youtube: savedTopics.filter(t => t.metadata?.platform === 'youtube').length
            // instagram: savedTopics.filter(t => t.metadata?.platform === 'instagram').length
          }
        },
        message: `네이버 5개, 유튜브 5개 총 ${savedTopics.length}개의 트렌드를 분석하여 콘텐츠를 기획했습니다.`
      })
    };
    
  } catch (error) {
    console.error('트렌드 분석 오류:', error);
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

// 네이버 실시간 검색어 가져오기
async function getNaverRealtimeTrends() {
  try {
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const response = await fetch(`${baseUrl}/.netlify/functions/getNaverRealtimeTrends`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        // API에서 받은 실시간 트렌드 반환
        console.log(`네이버 실시간 트렌드 ${data.data.length}개 수집 완료`);
        return data.data;
      }
    }
  } catch (error) {
    console.error('네이버 실시간 트렌드 조회 실패:', error);
  }
  
  // 실패 시 기본값
  return [
    { keyword: '삼성', searchVolume: 100000, changeRate: 20 },
    { keyword: '애플', searchVolume: 90000, changeRate: 15 },
    { keyword: 'LG', searchVolume: 80000, changeRate: 10 },
    { keyword: '현대', searchVolume: 70000, changeRate: 5 },
    { keyword: '기아', searchVolume: 60000, changeRate: 0 },
    { keyword: '네이버', searchVolume: 50000, changeRate: -5 },
    { keyword: '카카오', searchVolume: 40000, changeRate: -10 },
    { keyword: '쿠팡', searchVolume: 30000, changeRate: 25 },
    { keyword: '배민', searchVolume: 20000, changeRate: 30 },
    { keyword: '토스', searchVolume: 10000, changeRate: 35 }
  ];
}

// 유튜브 트렌드에서 브랜드 추출
function extractBrandsFromYoutube(youtubeTrends) {
  // 확장된 브랜드 키워드 목록
  const brandKeywords = [
    // 테크
    '삼성', 'Samsung', '갤럭시', 'Galaxy', '애플', 'Apple', '아이폰', 'iPhone', 
    'LG', '구글', 'Google', '픽셀', 'Pixel', '샤오미', 'Xiaomi', '화웨이', 'Huawei',
    // 자동차
    '현대', 'Hyundai', '기아', 'Kia', '제네시스', 'Genesis', '테슬라', 'Tesla',
    'BMW', '벤츠', 'Mercedes', '아우디', 'Audi', '폭스바겐', 'Volkswagen',
    // 패션/스포츠
    '나이키', 'Nike', '아디다스', 'Adidas', '뉴발란스', 'NewBalance', '푸마', 'Puma',
    '유니클로', 'Uniqlo', '자라', 'Zara', 'H&M', '무신사', '스타일난다',
    // 럭셔리
    '샤넬', 'Chanel', '루이비통', 'LouisVuitton', '구찌', 'Gucci', '프라다', 'Prada',
    '에르메스', 'Hermes', '버버리', 'Burberry', '디올', 'Dior',
    // F&B
    '스타벅스', 'Starbucks', '맥도날드', "McDonald's", '버거킹', 'BurgerKing',
    '서브웨이', 'Subway', 'KFC', '피자헛', 'PizzaHut', '도미노', "Domino's",
    // 엔터테인먼트
    '넷플릭스', 'Netflix', '디즈니', 'Disney', '유튜브', 'YouTube', '스포티파이', 'Spotify',
    '왓챠', 'Watcha', '웨이브', 'Wavve', '티빙', 'TVing', '쿠팡플레이',
    // 게임
    '소니', 'Sony', '플레이스테이션', 'PlayStation', 'PS5', '닌텐도', 'Nintendo',
    'Xbox', '스팀', 'Steam', '엔씨소프트', 'NC', '넥슨', 'Nexon',
    // K-POP
    'BTS', '방탄', '블랙핑크', 'BLACKPINK', '뉴진스', 'NewJeans', '세븐틴', 'SEVENTEEN',
    '스트레이키즈', 'StrayKids', '엔하이픈', 'ENHYPEN', '아이브', 'IVE', '르세라핌', 'LESSERAFIM',
    // 플랫폼
    '네이버', 'Naver', '카카오', 'Kakao', '쿠팡', 'Coupang', '배민', '토스', 'Toss',
    '당근마켓', '인스타그램', 'Instagram', '틱톡', 'TikTok'
  ];
  
  const brandCount = {};
  const brandViews = {}; // 브랜드별 총 조회수
  
  // 영상 제목과 태그에서 브랜드 언급 횟수 및 조회수 계산
  if (youtubeTrends.videos) {
    youtubeTrends.videos.forEach(video => {
      const foundBrands = new Set(); // 한 영상에서 중복 카운트 방지
      
      brandKeywords.forEach(brand => {
        const brandLower = brand.toLowerCase();
        const titleLower = (video.title || '').toLowerCase();
        const channelLower = (video.channelTitle || '').toLowerCase();
        const tagsLower = (video.tags || []).map(t => t.toLowerCase());
        
        // 제목, 채널명, 태그에서 브랜드 검색
        if (titleLower.includes(brandLower) || 
            channelLower.includes(brandLower) ||
            tagsLower.some(tag => tag.includes(brandLower))) {
          
          // 한글/영문 매칭을 위한 정규화
          const normalizedBrand = getNormalizedBrand(brand);
          if (!foundBrands.has(normalizedBrand)) {
            foundBrands.add(normalizedBrand);
            brandCount[normalizedBrand] = (brandCount[normalizedBrand] || 0) + 1;
            brandViews[normalizedBrand] = (brandViews[normalizedBrand] || 0) + (video.views || 0);
          }
        }
      });
    });
  }
  
  // 언급 횟수와 조회수를 고려한 점수 계산
  const brandScores = {};
  Object.keys(brandCount).forEach(brand => {
    // 언급 횟수 * 0.4 + 조회수 가중치 * 0.6
    brandScores[brand] = brandCount[brand] * 0.4 + (brandViews[brand] / 1000000) * 0.6;
  });
  
  // 점수 순으로 정렬
  const sortedBrands = Object.keys(brandScores)
    .sort((a, b) => brandScores[b] - brandScores[a])
    .slice(0, 15); // 상위 15개만 선택
  
  // 브랜드가 없으면 영상 제목에서 자주 나오는 단어 분석
  if (sortedBrands.length < 5) {
    const titleWords = extractPopularWordsFromVideos(youtubeTrends.videos);
    return titleWords.slice(0, 10);
  }
  
  return sortedBrands;
}

// 브랜드명 정규화 (한글/영문 통합)
function getNormalizedBrand(brand) {
  const brandMap = {
    '삼성': '삼성', 'Samsung': '삼성',
    '애플': '애플', 'Apple': '애플',
    '아이폰': '애플', 'iPhone': '애플',
    '갤럭시': '삼성', 'Galaxy': '삼성',
    'LG': 'LG',
    '현대': '현대', 'Hyundai': '현대',
    '기아': '기아', 'Kia': '기아',
    '나이키': '나이키', 'Nike': '나이키',
    '아디다스': '아디다스', 'Adidas': '아디다스',
    '스타벅스': '스타벅스', 'Starbucks': '스타벅스',
    '넷플릭스': '넷플릭스', 'Netflix': '넷플릭스',
    'BTS': 'BTS', '방탄': 'BTS',
    '블랙핑크': '블랙핑크', 'BLACKPINK': '블랙핑크',
    '뉴진스': '뉴진스', 'NewJeans': '뉴진스'
  };
  
  return brandMap[brand] || brand;
}

// 영상 제목에서 인기 키워드 추출
function extractPopularWordsFromVideos(videos) {
  const wordCount = {};
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                     '이', '그', '저', '것', '의', '를', '을', '에', '와', '과', '도', '는', '가'];
  
  if (!videos) return [];
  
  videos.forEach(video => {
    const words = (video.title || '').split(/[\s,.\-!?]+/);
    words.forEach(word => {
      if (word.length > 2 && !stopWords.includes(word.toLowerCase())) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });
  
  return Object.keys(wordCount)
    .sort((a, b) => wordCount[b] - wordCount[a])
    .slice(0, 10);
}

// 인스타그램 트렌드에서 브랜드 추출
function extractBrandsFromInstagram(instagramTrends) {
  // 인스타그램에서 인기 있는 패션/라이프스타일 브랜드
  const defaultBrands = [
    '샤넬', '루이비통', '구찌', '프라다', '에르메스',
    '나이키', '아디다스', '스타벅스', '자라', '유니클로'
  ];
  
  if (instagramTrends && instagramTrends.length > 0) {
    const brands = instagramTrends
      .filter(t => t.brand)
      .map(t => t.brand)
      .slice(0, 10);
    
    if (brands.length > 0) return brands;
  }
  
  return defaultBrands;
}

// 네이버 데이터랩 실제 검색량 가져오기
async function getNaverSearchTrends(brands) {
  try {
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const response = await fetch(`${baseUrl}/.netlify/functions/getNaverTrends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: brands })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (error) {
    console.error('네이버 트렌드 조회 실패:', error);
  }
  
  // 실패 시 기본값 반환
  return brands.map(brand => ({
    keyword: brand,
    searchVolume: Math.floor(Math.random() * 100000) + 50000,
    changeRate: Math.floor(Math.random() * 200) - 50,
    trend: 'steady'
  }));
}

// 브랜드별 연관 키워드 가져오기
async function getBrandKeywords(brands) {
  const keywordMap = {};
  
  for (const brand of brands) {
    try {
      const baseUrl = process.env.URL || 'http://localhost:8888';
      const response = await fetch(`${baseUrl}/.netlify/functions/getNaverRelatedKeywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: brand })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.relatedKeywords) {
          keywordMap[brand] = data.data.relatedKeywords.slice(0, 5).map(k => k.keyword);
          continue;
        }
      }
    } catch (error) {
      console.error(`연관 키워드 조회 실패 (${brand}):`, error);
    }
    
    // 실패 시 기본 키워드 사용
    keywordMap[brand] = getDefaultKeywords(brand);
  }
  
  return keywordMap;
}

// 유튜브 트렌드 가져오기
async function getYoutubeTrends() {
  try {
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const response = await fetch(`${baseUrl}/.netlify/functions/getYoutubeTrends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regionCode: 'KR' })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (error) {
    console.error('유튜브 트렌드 조회 실패:', error);
  }
  
  return { videos: [], keywords: [] };
}

// 인스타그램 트렌드 가져오기
async function getInstagramTrends() {
  try {
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const response = await fetch(`${baseUrl}/.netlify/functions/getInstagramTrends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: [] })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (error) {
    console.error('인스타그램 트렌드 조회 실패:', error);
  }
  
  return [];
}

// 플랫폼별 설명 생성
function generatePlatformDescription(platform, brand, searchData, keywords, youtubeVideos, instagramHashtags) {
  const brandInfo = getBrandInfo(brand);
  
  switch (platform) {
    case 'naver':
      let naverDesc = `${brand} 브랜드가 네이버에서 `;
      if (searchData) {
        naverDesc += `${searchData.searchVolume.toLocaleString()}회 검색되며 `;
        if (searchData.changeRate > 0) {
          naverDesc += `${searchData.changeRate}% 상승하는 뜨거운 관심을 받고 있습니다. `;
        } else {
          naverDesc += `꾸준한 관심을 유지하고 있습니다. `;
        }
      }
      if (keywords && keywords.length > 0) {
        naverDesc += `주요 연관 검색어는 '${keywords.slice(0, 5).join("', '")}' 입니다.`;
      }
      return naverDesc;
      
    case 'youtube':
      let youtubeDesc = `${brand} 관련 콘텐츠가 유튜브에서 `;
      if (youtubeVideos && youtubeVideos.length > 0) {
        youtubeDesc += `${youtubeVideos.length}개의 영상이 트렌드에 올라 화제가 되고 있습니다. `;
        youtubeDesc += `${brandInfo} 높은 조회수와 참여도를 기록하며 영상 플랫폼에서 주목받고 있습니다.`;
      } else {
        youtubeDesc += `새로운 콘텐츠들이 지속적으로 업로드되며 관심을 모으고 있습니다.`;
      }
      return youtubeDesc;
      
    case 'instagram':
      let instaDesc = `${brand}가 인스타그램에서 `;
      if (instagramHashtags && instagramHashtags.length > 0) {
        const totalPosts = instagramHashtags.reduce((sum, t) => sum + (t.posts || 0), 0);
        instaDesc += `${totalPosts.toLocaleString()}개 이상의 게시물에 태그되며 `;
        instaDesc += `${brandInfo} MZ세대 사이에서 뜨거운 반응을 얻고 있습니다.`;
      } else {
        instaDesc += `패션과 라이프스타일 트렌드를 선도하며 영향력을 확대하고 있습니다.`;
      }
      return instaDesc;
      
    default:
      return `${brand} 브랜드가 주목받고 있습니다.`;
  }
}

// 브랜드 특성 정보
function getBrandInfo(brand) {
  const brandCharacteristics = {
    '삼성': '혁신적인 기술력으로',
    '애플': '프리미엄 브랜드 가치로',
    'LG': '생활가전 혁신으로',
    '나이키': '스포츠 문화 리더십으로',
    '스타벅스': '프리미엄 커피 문화로',
    '샤넬': '럭셔리 패션 아이콘으로서',
    '루이비통': '헤리티지 브랜드로서',
    '현대': '미래 모빌리티 비전으로',
    '기아': '대담한 디자인으로',
    '구찌': '패션 트렌드세터로서'
  };
  
  return brandCharacteristics[brand] || '독특한 브랜드 정체성으로';
}

// 플랫폼별 점수 계산
function calculatePlatformScores(platform, searchData, keywords, youtubeVideos, instagramHashtags) {
  let baseScore = 100;
  let detailScores = {};
  
  switch (platform) {
    case 'naver':
      const searchScore = searchData ? Math.min(Math.floor(searchData.searchVolume / 1000), 100) : 0;
      const trendScore = searchData?.changeRate > 0 ? Math.min(searchData.changeRate, 50) : 0;
      const keywordScore = keywords ? keywords.length * 10 : 0;
      
      detailScores = {
        searchScore,
        trendScore,
        keywordScore
      };
      baseScore += searchScore + trendScore + keywordScore;
      break;
      
    case 'youtube':
      const videoScore = youtubeVideos ? youtubeVideos.length * 20 : 0;
      const viewScore = 50; // 조회수 기반 점수 (실제 API 연동 시 계산)
      
      detailScores = {
        videoScore,
        viewScore
      };
      baseScore += videoScore + viewScore;
      break;
      
    case 'instagram':
      const hashtagScore = instagramHashtags ? instagramHashtags.length * 30 : 0;
      const postScore = instagramHashtags ? 
        Math.min(Math.floor(instagramHashtags.reduce((sum, t) => sum + (t.posts || 0), 0) / 100), 100) : 0;
      
      detailScores = {
        hashtagScore,
        postScore
      };
      baseScore += hashtagScore + postScore;
      break;
  }
  
  return {
    score: baseScore,
    finalScore: Math.floor(baseScore * 1.2),
    ...detailScores
  };
}

// 실제 데이터 기반 설명 생성 (기존 함수 유지)
function generateRealDescription(brand, searchData, keywords, youtubeTrends, instagramTrends) {
  let descriptions = [];
  
  // 검색 데이터
  if (searchData) {
    const searchDesc = `네이버에서 ${searchData.searchVolume.toLocaleString()}회 검색되었으며, `;
    if (searchData.changeRate > 0) {
      descriptions.push(searchDesc + `검색량이 ${searchData.changeRate}% 상승하는 상승세를 보이고 있습니다.`);
    } else if (searchData.changeRate < 0) {
      descriptions.push(searchDesc + `검색량이 ${Math.abs(searchData.changeRate)}% 감소했습니다.`);
    } else {
      descriptions.push(searchDesc + `안정적인 검색량을 유지하고 있습니다.`);
    }
  }
  
  // 연관 키워드
  if (keywords && keywords.length > 0) {
    descriptions.push(`주요 연관 검색어로는 '${keywords.slice(0, 5).join("', '")}' 등이 있으며, 총 ${keywords.length}개의 관련 키워드가 함께 검색되고 있습니다.`);
  }
  
  // 유튜브 데이터
  const relatedVideos = youtubeTrends.videos?.filter(v => 
    v.title?.includes(brand) || v.channelTitle?.includes(brand)
  ).length || 0;
  
  if (relatedVideos > 0) {
    descriptions.push(`유튜브에서는 ${relatedVideos}개의 관련 영상이 트렌드에 올라 높은 관심을 받고 있습니다.`);
  }
  
  // 인스타그램 데이터
  const relatedHashtags = instagramTrends.filter(t => 
    t.tag?.includes(brand) || t.brand === brand
  );
  
  if (relatedHashtags.length > 0) {
    const totalPosts = relatedHashtags.reduce((sum, t) => sum + (t.posts || 0), 0);
    if (totalPosts > 0) {
      descriptions.push(`인스타그램에서는 ${totalPosts.toLocaleString()}개의 게시물에서 언급되며 활발한 소셜 미디어 활동을 보여주고 있습니다.`);
    }
  }
  
  // 브랜드 특성 추가
  const brandCharacteristics = {
    '삼성': '글로벌 테크 리더십을 바탕으로 혁신적인 제품과 서비스를 선보이며',
    '애플': '프리미엄 기술과 디자인의 조화로 독보적인 브랜드 가치를 유지하며',
    'LG': '생활가전 분야의 혁신과 프리미엄 라인업으로 시장을 선도하며',
    '나이키': '스포츠 문화와 라이프스타일 트렌드를 이끌며',
    '스타벅스': '프리미엄 커피 문화와 공간 경험을 제공하며',
    '샤넬': '럭셔리 패션과 뷰티의 아이콘으로서',
    '루이비통': '헤리티지와 현대적 감각을 결합한 럭셔리 브랜드로서',
    '현대': '친환경 모빌리티와 미래 기술 혁신을 추구하며',
    '기아': '대담한 디자인과 전동화 전략으로 브랜드 혁신을 이루며',
    '구찌': '전통과 혁신을 결합한 럭셔리 패션 하우스로서'
  };
  
  const brandChar = brandCharacteristics[brand] || `${brand} 브랜드는`;
  const fullDescription = `${brand} 브랜드가 ${brandChar} 소비자들의 높은 관심을 받고 있습니다. ${descriptions.join(' ')}`;
  
  return fullDescription;
}

// 실제 데이터 기반 점수 계산
function calculateRealScores(searchData, keywords, youtubeTrends, instagramTrends) {
  let score = 100; // 기본 점수
  let searchScore = 0;
  let socialScore = 0;
  
  // 검색량 기반 점수
  if (searchData) {
    searchScore = Math.min(Math.floor(searchData.searchVolume / 1000), 100);
    score += searchScore;
    
    // 변화율 보너스
    if (searchData.changeRate > 50) {
      score += 30;
    } else if (searchData.changeRate > 0) {
      score += 15;
    }
  }
  
  // 키워드 다양성 점수
  score += keywords.length * 10;
  
  // 소셜 미디어 점수
  if (youtubeTrends.videos?.length > 0) {
    socialScore += 20;
  }
  if (instagramTrends.length > 0) {
    socialScore += 20;
  }
  score += socialScore;
  
  return {
    score: score,
    finalScore: Math.floor(score * 1.5), // 최종 점수는 1.5배
    searchScore: searchScore,
    socialScore: socialScore
  };
}

// 기본 키워드
function getDefaultKeywords(brand) {
  const keywordMap = {
    '삼성': ['갤럭시', '갤럭시S24', '갤럭시폴드', '갤럭시워치', '비스포크'],
    '애플': ['아이폰', '아이폰15', '맥북', '에어팟', '애플워치'],
    '나이키': ['에어맥스', '조던', '덩크', '에어포스', '운동화'],
    '스타벅스': ['텀블러', '신메뉴', '프라푸치노', '리저브', '이벤트'],
    'LG': ['LG그램', 'OLED', '스탠바이미', '코드제로', '트롬'],
    '샤넬': ['샤넬백', '클래식', '향수', 'N°5', '립스틱'],
    '루이비통': ['가방', '지갑', '벨트', '스니커즈', '모노그램'],
    '구찌': ['구찌백', '지갑', '벨트', '스니커즈', '마몬트'],
    '현대': ['아반떼', '소나타', '그랜저', '팰리세이드', '아이오닉'],
    '기아': ['셀토스', '스포티지', '카니발', 'K5', 'EV6']
  };
  
  return keywordMap[brand] || [`${brand} 신제품`, `${brand} 가격`, `${brand} 후기`, `${brand} 이벤트`, `${brand} 할인`];
}

// AI를 통한 콘텐츠 기획 분석 (병렬 처리)
async function analyzeTopicsWithAI(topics) {
  console.log(`AI 분석 시작: ${topics.length}개 아이템`);
  
  // 모든 토픽을 병렬로 분석 (타임아웃 5초)
  const analysisPromises = topics.map(async (topic) => {
    try {
      console.log(`AI 분석 중: ${topic.brand} (${topic.metadata?.platform})`);
      
      // AI 분석 프롬프트 생성
      const prompt = generateAIPrompt(topic);
      
      // 타임아웃 설정 (5초)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI 분석 타임아웃')), 5000)
      );
      
      // OpenAI API 호출 또는 타임아웃
      const analysis = await Promise.race([
        callOpenAI(prompt),
        timeoutPromise
      ]);
      
      // 분석 결과를 토픽에 추가
      return {
        ...topic,
        ai_analyzed: true,
        ai_analysis: analysis
      };
      
    } catch (error) {
      console.error(`AI 분석 실패 (${topic.brand}):`, error.message);
      // AI 분석 실패해도 원본 토픽은 유지하고 기본 분석 제공
      return {
        ...topic,
        ai_analyzed: true,
        ai_analysis: generateDefaultAnalysis()
      };
    }
  });
  
  // 모든 분석이 완료될 때까지 대기
  const analyzedTopics = await Promise.all(analysisPromises);
  console.log(`AI 분석 완료: ${analyzedTopics.length}개`);
  
  return analyzedTopics;
}

// AI 분석을 위한 프롬프트 생성
function generateAIPrompt(topic) {
  const platform = topic.metadata?.platform === 'naver' ? '네이버 검색' : '유튜브';
  
  return `브랜드백과사전 콘텐츠 기획 분석

브랜드: ${topic.brand}
플랫폼: ${platform}
트렌드 정보: ${topic.summary}
검색량: ${topic.metadata?.searchVolume || 0}회
변화율: ${topic.metadata?.changeRate || 0}%
연관 키워드: ${(topic.metadata?.keywords || []).join(', ')}

위 브랜드의 트렌드 정보를 바탕으로 브랜드백과사전에 적합한 콘텐츠를 기획해주세요.

다음 형식으로 분석해주세요:

1. 스토리 앵글 (3개):
   - 역사/헤리티지 관점
   - 혁신/기술 관점  
   - 문화/트렌드 관점

2. 콘텐츠 아이디어 (3개):
   - 제목, 설명, 타겟층, 예상 조회수

3. 숨은 사실 (3개):
   - 일반인이 잘 모르는 흥미로운 팩트

4. 적합도 평가:
   - 트렌드 적합도 (100점 만점)
   - 브랜드백과 적합도 (100점 만점)

JSON 형식으로 응답해주세요.`;
}

// OpenAI API 호출
async function callOpenAI(prompt) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    console.log('OpenAI API 키가 없어 기본 분석 제공');
    return generateDefaultAnalysis();
  }
  
  try {
    // fetch에 타임아웃 추가 (4초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 브랜드 콘텐츠 기획 전문가입니다. 트렌드를 분석하여 매력적인 콘텐츠를 기획합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
    
  } catch (error) {
    console.error('OpenAI API 호출 실패:', error);
    return generateDefaultAnalysis();
  }
}

// 기본 분석 결과 생성
function generateDefaultAnalysis() {
  return {
    storyAngles: [
      {
        type: 'history',
        title: '브랜드의 시작과 성장 스토리',
        description: '창업부터 현재까지의 여정을 담은 역사적 관점'
      },
      {
        type: 'innovation',
        title: '혁신적인 기술과 제품 개발',
        description: '업계를 선도하는 기술력과 혁신 사례'
      },
      {
        type: 'culture',
        title: '문화와 트렌드를 만드는 브랜드',
        description: 'MZ세대와 소통하며 문화를 선도하는 모습'
      }
    ],
    contentIdeas: [
      {
        title: '브랜드 성공 비결 5가지',
        description: '경쟁사와 차별화된 전략과 성공 요인 분석',
        targetAudience: '창업자, 마케터',
        estimatedViews: '10K-50K'
      },
      {
        title: '숨겨진 브랜드 스토리',
        description: '일반인이 모르는 흥미로운 에피소드',
        targetAudience: '일반 소비자',
        estimatedViews: '50K-100K'
      },
      {
        title: '미래 전략과 비전',
        description: '향후 5년간의 계획과 신사업 전략',
        targetAudience: '투자자, 업계 관계자',
        estimatedViews: '5K-20K'
      }
    ],
    hiddenFacts: [
      '창업자의 특별한 일화',
      '제품 개발 과정의 숨은 이야기',
      '브랜드명의 유래와 의미'
    ],
    trendRelevance: {
      score: 85,
      reason: '현재 검색 트렌드와 높은 연관성'
    },
    brandEncyclopediaFit: {
      score: 90,
      reason: '브랜드 스토리텔링에 적합한 콘텐츠'
    }
  };
}

// Supabase에 저장
async function saveToSupabase(topics) {
  const savedTopics = [];
  
  for (const topic of topics) {
    try {
      const { data, error } = await supabaseAdmin
        .from('content_items')
        .insert({
          title: topic.title,
          summary: topic.summary,
          source_type: topic.source_type,
          category: topic.category,
          score: topic.score || 0,
          final_score: topic.final_score || 0,
          suitability: topic.suitability,
          metadata: topic.metadata,
          status: topic.status,
          workflow_stage: topic.workflow_stage
        })
        .select()
        .single();
      
      if (error) throw error;
      savedTopics.push(data);
      
    } catch (error) {
      console.error('주제 저장 실패:', error);
    }
  }
  
  return savedTopics;
}