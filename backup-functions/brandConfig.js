// 브랜드백과사전 설정 - 서버용
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
    history: ['창업', '설립', '창립', '탄생', '시작', '역사', '연혁', '창업자', '설립자', '첫', '최초', '원조', '기원', '유래', '배경'],
    identity: ['로고', '슬로건', 'CI', 'BI', '브랜딩', '리브랜딩', '이미지', '정체성', '철학', '가치', '비전', '미션', '문화', 'DNA'],
    story: ['스토리', '이야기', '일화', '비하인드', '숨은', '비밀', '알려지지 않은'],
    product: ['제품', '상품', '신제품', '출시', '런칭', '라인업', '모델', '시리즈'],
    trending: ['화제', '인기', '대란', '품절', '완판', '흥행', '돌풍', '열풍'],
    business: ['매출', '실적', '성장', '인수', '합병', 'M&A', '투자', '상장', 'IPO']
  },

  scoring: {
    brandMention: 30,
    historyKeyword: 20,
    identityKeyword: 15,
    storyKeyword: 15,
    trendingKeyword: 25
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
  let interestLevel = 'low';
  if (totalScore >= 100) {
    interestLevel = 'high';
  } else if (totalScore >= 50) {
    interestLevel = 'medium';
  }
  
  return {
    score: totalScore,
    brands: brands,
    details: evaluationDetails,
    interestLevel: interestLevel,
    suitable: brands.length > 0 && totalScore >= 50
  };
}