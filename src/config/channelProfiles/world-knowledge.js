// 세상의모든지식 채널 프로필
// YouTube Channel: 세상의모든지식
// 채널 DNA 및 콘텐츠 가이드라인

export const WorldKnowledgeProfile = {
  // 채널 기본 정보
  channelInfo: {
    id: 'world-knowledge',
    name: '세상의모든지식',
    platform: 'YouTube',
    category: '교육/지식',
    targetAudience: {
      primary: '20-40대 지식 탐구자',
      secondary: '새로운 정보에 호기심이 많은 전 연령층',
      characteristics: [
        '지적 호기심이 강함',
        '다양한 분야에 관심',
        '신뢰할 수 있는 정보 선호',
        '시각적 설명 선호',
        '짧고 명확한 설명 선호'
      ]
    }
  },

  // 콘텐츠 정체성
  contentIdentity: {
    mission: '복잡한 세상을 쉽고 재미있게 설명하여 모든 사람이 지식에 접근할 수 있도록 한다',
    vision: '누구나 즐길 수 있는 지식 콘텐츠의 새로운 기준을 만든다',
    coreValues: [
      '정확성: 철저한 팩트체크와 신뢰할 수 있는 출처',
      '접근성: 어려운 개념도 쉽게 설명',
      '흥미성: 지루하지 않은 스토리텔링',
      '다양성: 과학, 역사, 경제, 문화 등 다양한 주제',
      '시의성: 현재 이슈와 연결된 콘텐츠'
    ],
    uniqueSellingPoint: '전문가 수준의 정보를 초등학생도 이해할 수 있게 전달하는 능력'
  },

  // 톤 앤 매너
  toneAndManner: {
    writingStyle: {
      tone: 'friendly-professional', // 친근하면서도 전문적
      voice: 'conversational-educational', // 대화체이면서 교육적
      pace: 'moderate', // 적당한 속도
      complexity: 'progressive', // 점진적으로 복잡해지는 설명
      
      characteristics: [
        '친근한 대화체 사용',
        '전문 용어는 꼭 필요한 경우만 사용하고 반드시 설명',
        '비유와 예시를 적극 활용',
        '질문을 던지며 시청자 참여 유도',
        '긍정적이고 희망적인 메시지'
      ],
      
      avoidList: [
        '지나치게 학술적인 표현',
        '부정적이거나 선정적인 표현',
        '편향된 정치적 견해',
        '검증되지 않은 루머나 추측',
        '과도한 전문 용어 나열'
      ]
    },
    
    visualStyle: {
      primaryColors: ['#4A90E2', '#50C878', '#FFD700'],
      mood: 'bright-professional',
      graphicsStyle: 'clean-infographic',
      animationStyle: 'smooth-educational',
      
      preferences: [
        '깔끔한 인포그래픽',
        '이해를 돕는 다이어그램',
        '친근한 일러스트레이션',
        '데이터 시각화',
        '타임라인과 프로세스 도표'
      ]
    },
    
    narrativeStructure: {
      opening: '흥미로운 질문이나 놀라운 사실로 시작',
      development: '단계별로 복잡도를 높이며 설명',
      climax: '핵심 인사이트나 "아하!" 모먼트',
      conclusion: '실생활 적용이나 미래 전망',
      
      hooks: [
        '혹시 ~를 알고 계셨나요?',
        '오늘은 ~에 대해 알아보겠습니다',
        '~가 궁금하지 않으신가요?',
        '놀랍게도 ~',
        '사실 우리가 몰랐던 ~'
      ]
    }
  },

  // 콘텐츠 카테고리 및 주제
  contentCategories: {
    science: {
      weight: 0.25,
      topics: ['최신 과학 발견', 'AI와 기술', '우주와 천문학', '생명과학', '환경과 기후'],
      approach: '복잡한 과학을 일상 예시로 설명'
    },
    history: {
      weight: 0.20,
      topics: ['숨겨진 역사', '역사 속 인물', '문명의 발전', '역사적 사건의 재해석'],
      approach: '현재와 연결점을 찾아 관련성 부각'
    },
    economy: {
      weight: 0.20,
      topics: ['경제 현상 설명', '금융 리터러시', '기업 이야기', '경제 트렌드'],
      approach: '실생활 예시로 경제 원리 설명'
    },
    society: {
      weight: 0.15,
      topics: ['사회 현상 분석', '문화 비교', '글로벌 이슈', '세대 차이'],
      approach: '다양한 관점을 균형있게 제시'
    },
    innovation: {
      weight: 0.20,
      topics: ['신기술 소개', '미래 예측', '혁신 사례', '스타트업 스토리'],
      approach: '기술이 바꿀 우리의 미래 그리기'
    }
  },

  // 콘텐츠 선정 기준
  contentSelectionCriteria: {
    relevance: {
      weight: 0.30,
      factors: [
        '현재 이슈와의 연관성',
        '시청자 관심도',
        '검색 트렌드',
        '사회적 중요성'
      ]
    },
    educational: {
      weight: 0.25,
      factors: [
        '교육적 가치',
        '새로운 지식 제공',
        '오해 바로잡기',
        '사고력 향상'
      ]
    },
    entertainment: {
      weight: 0.20,
      factors: [
        '흥미로운 스토리',
        '놀라운 사실',
        '호기심 자극',
        '감정적 연결'
      ]
    },
    shareability: {
      weight: 0.15,
      factors: [
        '공유하고 싶은 정보',
        '대화 소재',
        'SNS 확산 가능성',
        '밈 가능성'
      ]
    },
    uniqueness: {
      weight: 0.10,
      factors: [
        '독창적 관점',
        '새로운 해석',
        '독점 정보',
        '차별화된 접근'
      ]
    }
  },

  // 제작 가이드라인
  productionGuidelines: {
    videoLength: {
      short: '3-5분 (핵심 정보 전달)',
      medium: '8-12분 (일반 주제)',
      long: '15-20분 (심층 분석)'
    },
    
    scriptStructure: {
      introduction: '15-20% (호기심 자극)',
      mainContent: '60-70% (핵심 정보)',
      conclusion: '10-15% (정리 및 시사점)',
      callToAction: '5% (구독, 좋아요, 다음 영상 예고)'
    },
    
    visualElements: {
      textOverlay: '핵심 포인트 강조',
      infographics: '복잡한 정보 시각화',
      animations: '프로세스와 변화 설명',
      stockFootage: '맥락 제공',
      customGraphics: '브랜드 일관성'
    },
    
    audioElements: {
      narration: '명확하고 친근한 목소리',
      backgroundMusic: '집중을 돕는 잔잔한 BGM',
      soundEffects: '포인트 강조용 효과음',
      pacing: '적절한 호흡과 강약 조절'
    }
  },

  // 성공 지표
  successMetrics: {
    engagement: {
      viewDuration: '평균 시청 시간 70% 이상',
      likes: '조회수 대비 5% 이상',
      comments: '긍정적 피드백 비율 80% 이상',
      shares: '조회수 대비 2% 이상'
    },
    growth: {
      subscribers: '월 10% 성장',
      views: '영상당 평균 10만 뷰',
      retention: '구독자 이탈률 5% 이하'
    },
    quality: {
      accuracy: '팩트 오류 0%',
      clarity: '이해도 평가 4.5/5 이상',
      satisfaction: '시청자 만족도 90% 이상'
    }
  },

  // 금기 사항
  restrictions: {
    absolute: [
      '가짜 뉴스나 잘못된 정보',
      '정치적 편향',
      '종교적 편견',
      '차별적 표현',
      '선정적 콘텐츠',
      '저작권 침해'
    ],
    careful: [
      '논란이 될 수 있는 주제는 균형잡힌 시각 유지',
      '민감한 주제는 충분한 리서치 후 접근',
      '추측이나 루머는 명확히 구분',
      '개인 정보나 사생활 보호'
    ]
  },

  // 레퍼런스 및 벤치마크
  references: {
    inspirations: [
      'Kurzgesagt (과학 시각화)',
      'Vox (스토리텔링)',
      'TED-Ed (교육적 접근)',
      'Vsauce (호기심 자극)',
      'CGP Grey (명확한 설명)'
    ],
    localCompetitors: [
      '사물궁이 잡학지식',
      '지식 브런치',
      '1분과학'
    ],
    differentiators: [
      '한국적 맥락과 예시 활용',
      '최신 국내 이슈 반영',
      'K-Culture 연결점',
      '한국인 정서에 맞는 스토리텔링'
    ]
  }
};

// 채널 프로필 검증 함수
export function validateContent(content, profile = WorldKnowledgeProfile) {
  const validationResults = {
    score: 0,
    feedback: [],
    suggestions: []
  };
  
  // 톤앤매너 체크
  if (content.tone && profile.toneAndManner.writingStyle.tone.includes(content.tone)) {
    validationResults.score += 20;
  } else {
    validationResults.feedback.push('톤이 채널 스타일과 맞지 않습니다');
    validationResults.suggestions.push(`${profile.toneAndManner.writingStyle.tone} 톤 사용 권장`);
  }
  
  // 금기사항 체크
  for (const restriction of profile.restrictions.absolute) {
    if (content.text && content.text.includes(restriction)) {
      validationResults.score -= 50;
      validationResults.feedback.push(`금지된 내용 포함: ${restriction}`);
    }
  }
  
  // 카테고리 적합성
  if (content.category && profile.contentCategories[content.category]) {
    validationResults.score += 15;
  }
  
  return validationResults;
}

// 콘텐츠 점수 계산 함수
export function calculateContentScore(item, profile = WorldKnowledgeProfile) {
  let score = 0;
  const criteria = profile.contentSelectionCriteria;
  
  // 각 기준별 점수 계산
  Object.keys(criteria).forEach(criterion => {
    const weight = criteria[criterion].weight;
    const factors = criteria[criterion].factors;
    
    // 팩터별 점수 계산 (실제 구현 시 더 정교하게)
    let criterionScore = 0;
    factors.forEach(factor => {
      // 간단한 키워드 매칭으로 점수 부여
      if (item.title && item.title.includes(factor)) {
        criterionScore += 25;
      }
      if (item.summary && item.summary.includes(factor)) {
        criterionScore += 15;
      }
    });
    
    score += Math.min(criterionScore, 100) * weight;
  });
  
  return Math.round(score);
}

// 스크립트 스타일 가이드 적용 함수
export function applyStyleGuide(text, profile = WorldKnowledgeProfile) {
  const style = profile.toneAndManner.writingStyle;
  const narrative = profile.toneAndManner.narrativeStructure;
  
  // 훅 추가
  const hook = narrative.hooks[Math.floor(Math.random() * narrative.hooks.length)];
  
  // 스타일 적용된 텍스트 생성
  let styledText = text;
  
  // 전문용어 설명 추가
  // 실제 구현 시 NLP를 사용하여 전문용어 감지 및 설명 추가
  
  return {
    hook,
    styledText,
    structure: narrative
  };
}

export default WorldKnowledgeProfile;