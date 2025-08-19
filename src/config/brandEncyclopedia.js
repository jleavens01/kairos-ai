// 브랜드백과사전 - 세상의모든지식 메인 카테고리
// 브랜드의 역사와 아이덴티티를 다루는 콘텐츠

export const BrandEncyclopediaConfig = {
  // 주요 브랜드 카테고리
  categories: {
    tech: {
      name: '테크 브랜드',
      brands: ['삼성', '애플', 'LG', '구글', '테슬라', '마이크로소프트', '네이버', '카카오', '쿠팡', '배민'],
      weight: 0.3
    },
    fashion: {
      name: '패션 브랜드', 
      brands: ['샤넬', '루이비통', '구찌', '나이키', '아디다스', '유니클로', '자라', '무신사'],
      weight: 0.2
    },
    food: {
      name: '식품 브랜드',
      brands: ['코카콜라', '맥도날드', '스타벅스', '농심', '오뚜기', 'CJ', '롯데', '해태', '삼양'],
      weight: 0.2
    },
    automotive: {
      name: '자동차 브랜드',
      brands: ['현대', '기아', '벤츠', 'BMW', '토요타', '폭스바겐', '볼보', '포르쉐'],
      weight: 0.15
    },
    entertainment: {
      name: '엔터테인먼트',
      brands: ['디즈니', '넷플릭스', 'SM', 'YG', 'JYP', 'HYBE', '왓챠', '티빙'],
      weight: 0.15
    }
  },

  // 브랜드 관련 핵심 키워드
  keywords: {
    // 브랜드 역사 관련
    history: [
      '창업', '설립', '창립', '탄생', '시작', '역사', '연혁', '창업자', '설립자',
      '첫', '최초', '원조', '기원', '유래', '배경'
    ],
    
    // 브랜드 아이덴티티
    identity: [
      '로고', '슬로건', 'CI', 'BI', '브랜딩', '리브랜딩', '이미지', '정체성',
      '철학', '가치', '비전', '미션', '문화', 'DNA'
    ],
    
    // 브랜드 스토리
    story: [
      '스토리', '이야기', '일화', '비하인드', '숨은', '비밀', '알려지지 않은',
      '놀라운', '감동', '도전', '성공', '실패', '위기', '극복'
    ],
    
    // 브랜드 제품/서비스
    product: [
      '신제품', '출시', '런칭', '혁신', '최초', '대표', '시그니처', '플래그십',
      '베스트셀러', '스테디셀러', '한정판', '콜라보', '협업'
    ],
    
    // 브랜드 이슈/트렌드
    trending: [
      '화제', '논란', '이슈', '트렌드', '인기', '품절', '대란', '열풍',
      'MZ', 'Z세대', '레트로', '뉴트로', '리셀', '중고'
    ],
    
    // 브랜드 비즈니스
    business: [
      '매출', '실적', '성장', '확장', '인수', '합병', 'M&A', 'IPO', '상장',
      '투자', '가치', '시가총액', '점유율', '1위'
    ]
  },

  // 부정 키워드 (브랜드백과사전에 부적합)
  negativeKeywords: [
    '사고', '사망', '부도', '파산', '폐업', '리콜', '불매',
    '횡령', '배임', '뇌물', '담합', '탈세', '사기',
    '살인', '자살', '폭행', '성범죄', '마약'
  ],

  // 관심도 검증 지표
  interestIndicators: {
    // 높은 관심도 신호
    high: [
      '대란', '품절', '줄서기', '오픈런', '완판', '역대급', '최다', '최고',
      '1위', '돌파', '신기록', '화제의', '떠오르는', '핫한'
    ],
    
    // 중간 관심도 신호
    medium: [
      '주목', '관심', '인기', '화제', '이슈', '논란', '새로운', '혁신'
    ],
    
    // 낮은 관심도 신호
    low: [
      '소폭', '미미', '정체', '하락', '감소', '부진'
    ]
  },

  // 콘텐츠 가치 평가 기준
  contentValue: {
    // 역사적 가치 (브랜드 탄생, 전환점)
    historical: {
      weight: 0.3,
      keywords: ['창업', '설립', '최초', '첫', '시작', '탄생', '원조']
    },
    
    // 스토리 가치 (흥미로운 이야기)
    story: {
      weight: 0.25,
      keywords: ['비하인드', '숨은', '알려지지 않은', '놀라운', '감동']
    },
    
    // 교육적 가치 (브랜드 지식)
    educational: {
      weight: 0.2,
      keywords: ['의미', '유래', '이유', '방법', '전략', '비결']
    },
    
    // 시의성 (현재 이슈)
    timeliness: {
      weight: 0.15,
      keywords: ['최근', '오늘', '어제', '신제품', '출시', '발표']
    },
    
    // 화제성 (대중 관심)
    virality: {
      weight: 0.1,
      keywords: ['화제', '대란', '품절', '논란', 'SNS', '입소문']
    }
  },

  // 선정 점수 계산 가중치
  scoring: {
    brandMention: 30,        // 유명 브랜드 언급
    historyKeyword: 20,      // 역사 키워드
    identityKeyword: 15,     // 아이덴티티 키워드
    storyKeyword: 25,        // 스토리 키워드
    trendingKeyword: 15,     // 트렌드 키워드
    highInterest: 30,        // 높은 관심도
    mediumInterest: 15,      // 중간 관심도
    hasImage: 10,            // 이미지 있음
    recentNews: 20,          // 최신 뉴스 (6시간 이내)
    negativeKeyword: -50,    // 부정 키워드
    lowInterest: -20         // 낮은 관심도
  }
};

// 브랜드 감지 함수
export function detectBrands(text) {
  const detectedBrands = [];
  
  for (const category of Object.values(BrandEncyclopediaConfig.categories)) {
    for (const brand of category.brands) {
      if (text.includes(brand)) {
        detectedBrands.push({
          brand,
          category: category.name
        });
      }
    }
  }
  
  return detectedBrands;
}

// 관심도 평가 함수
export function evaluateInterest(text) {
  let interestLevel = 'low';
  let score = 0;
  
  // 높은 관심도 체크
  const highCount = BrandEncyclopediaConfig.interestIndicators.high.filter(
    keyword => text.includes(keyword)
  ).length;
  
  if (highCount > 0) {
    interestLevel = 'high';
    score = highCount * BrandEncyclopediaConfig.scoring.highInterest;
  } else {
    // 중간 관심도 체크
    const mediumCount = BrandEncyclopediaConfig.interestIndicators.medium.filter(
      keyword => text.includes(keyword)
    ).length;
    
    if (mediumCount > 0) {
      interestLevel = 'medium';
      score = mediumCount * BrandEncyclopediaConfig.scoring.mediumInterest;
    } else {
      // 낮은 관심도
      const lowCount = BrandEncyclopediaConfig.interestIndicators.low.filter(
        keyword => text.includes(keyword)
      ).length;
      
      if (lowCount > 0) {
        score = BrandEncyclopediaConfig.scoring.lowInterest;
      }
    }
  }
  
  return { interestLevel, score };
}

// 브랜드백과사전 적합성 평가
export function evaluateBrandContent(item) {
  const text = `${item.title} ${item.summary || ''}`;
  let totalScore = 0;
  const evaluationDetails = [];
  
  // 1. 브랜드 감지
  const brands = detectBrands(text);
  if (brands.length > 0) {
    totalScore += brands.length * BrandEncyclopediaConfig.scoring.brandMention;
    evaluationDetails.push(`브랜드 언급 (${brands.map(b => b.brand).join(', ')}): +${brands.length * 30}`);
  }
  
  // 2. 키워드 분석
  const keywordTypes = ['history', 'identity', 'story', 'product', 'trending', 'business'];
  
  for (const type of keywordTypes) {
    const keywords = BrandEncyclopediaConfig.keywords[type];
    const matches = keywords.filter(k => text.includes(k));
    
    if (matches.length > 0) {
      let points = 0;
      switch(type) {
        case 'history': points = matches.length * BrandEncyclopediaConfig.scoring.historyKeyword; break;
        case 'identity': points = matches.length * BrandEncyclopediaConfig.scoring.identityKeyword; break;
        case 'story': points = matches.length * BrandEncyclopediaConfig.scoring.storyKeyword; break;
        case 'trending': points = matches.length * BrandEncyclopediaConfig.scoring.trendingKeyword; break;
        default: points = matches.length * 10;
      }
      
      totalScore += points;
      evaluationDetails.push(`${type} 키워드 (${matches.length}개): +${points}`);
    }
  }
  
  // 3. 관심도 평가
  const interest = evaluateInterest(text);
  totalScore += interest.score;
  if (interest.score !== 0) {
    evaluationDetails.push(`관심도 (${interest.interestLevel}): ${interest.score > 0 ? '+' : ''}${interest.score}`);
  }
  
  // 4. 부정 키워드 체크
  const negativeMatches = BrandEncyclopediaConfig.negativeKeywords.filter(k => text.includes(k));
  if (negativeMatches.length > 0) {
    const penalty = negativeMatches.length * BrandEncyclopediaConfig.scoring.negativeKeyword;
    totalScore += penalty;
    evaluationDetails.push(`부적절 키워드: ${penalty}`);
  }
  
  // 5. 기타 요소
  if (item.imageUrl) {
    totalScore += BrandEncyclopediaConfig.scoring.hasImage;
    evaluationDetails.push(`이미지 있음: +${BrandEncyclopediaConfig.scoring.hasImage}`);
  }
  
  return {
    score: Math.max(0, totalScore),
    details: evaluationDetails,
    brands: brands,
    interestLevel: interest.interestLevel,
    suitable: totalScore >= 50 && brands.length > 0
  };
}