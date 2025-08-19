// 뉴스 수집 및 아이템 선정 API
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 채널 프로필 기반 카테고리 설정
import { WorldKnowledgeProfile } from '../../src/config/channelProfiles/world-knowledge.js';
// 브랜드백과사전 설정 - 서버용
import { evaluateBrandContent } from './brandConfig.js';

// 네이버 뉴스 카테고리 (채널 프로필 기반 가중치)
const NEWS_CATEGORIES = {
  society: { 
    id: '102', 
    name: '사회', 
    weight: WorldKnowledgeProfile.contentCategories.society?.weight || 0.15 
  },
  economy: { 
    id: '101', 
    name: '경제', 
    weight: WorldKnowledgeProfile.contentCategories.economy?.weight || 0.20 
  },
  life: { 
    id: '103', 
    name: '생활/문화', 
    weight: 0.15 
  },
  world: { 
    id: '104', 
    name: '세계', 
    weight: 0.10 
  },
  it: { 
    id: '105', 
    name: 'IT/과학', 
    weight: WorldKnowledgeProfile.contentCategories.science?.weight + 
            WorldKnowledgeProfile.contentCategories.innovation?.weight || 0.45 
  },
  politics: { 
    id: '100', 
    name: '정치', 
    weight: 0.05 // 채널 특성상 정치 콘텐츠 최소화
  }
};

// 세상의모든지식 채널 맞춤 키워드 (기존 - 현재 브랜드백과사전 키워드로 대체)
/*
const CONTENT_KEYWORDS = {
  positive: [
    // 과학/기술
    '혁신', '개발', '발견', '최초', '신기술', '돌파구', 
    '연구', '발명', '업그레이드', '인공지능', 'AI', '로봇', 
    '우주', '과학', '의학', '바이오', '나노', '양자',
    // 교육/지식
    '교육', '학습', '지식', '정보', '이해', '원리', '방법',
    // 미래/혁신
    '미래', '스마트', '친환경', '지속가능', '그린', '에너지',
    // 역사/문화
    '역사', '문명', '문화', '전통', '유산', '발굴'
  ],
  negative: [
    // 채널 정체성과 맞지 않는 부정적 키워드
    '사망', '사고', '범죄', '폭력', '논란', '비판', '갈등', 
    '부정', '스캔들', '비리', '폭행', '살인', '자살', '테러', 
    '전쟁', '재난', '파산', '몰락', '실패', '추락'
  ],
  trending: [
    // 화제성/공유가치
    '놀라운', '충격', '화제', '신기한', '흥미로운', '재미있는',
    '최고', '역대', '믿기지 않는', '반전', '비밀', '진실'
  ],
  educational: [
    // 교육적 가치 키워드
    '알아보자', '이유', '원인', '방법', '원리', '설명',
    '분석', '비교', '차이', '특징', '장단점', '효과'
  ]
};
*/

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
    const { mode = 'auto', category = null, count = 10, useAI = true } = JSON.parse(event.body || '{}');
    
    console.log('뉴스 수집 시작:', { mode, category, count, useAI });
    console.log('AI 분석 활성화 여부:', useAI);
    
    // 1. 뉴스 수집
    const newsItems = await collectNewsFromNaver(category, count * 3); // 필터링을 고려해 3배 수집
    
    // 2. 콘텐츠 적합성 평가
    const evaluatedItems = evaluateNewsItems(newsItems);
    console.log('브랜드 평가 결과:', {
      총아이템: evaluatedItems.length,
      브랜드포함: evaluatedItems.filter(item => item.isBrandContent).length,
      평균점수: Math.round(evaluatedItems.reduce((sum, item) => sum + item.score, 0) / evaluatedItems.length)
    });
    
    // 브랜드 포함 아이템 상세
    const brandItems = evaluatedItems.filter(item => item.brands && item.brands.length > 0);
    if (brandItems.length > 0) {
      console.log('감지된 브랜드 아이템:');
      brandItems.slice(0, 3).forEach(item => {
        console.log(`  - ${item.title.substring(0, 30)}... [${item.brands.map(b => b.brand).join(', ')}] 점수: ${item.score}`);
      });
    }
    
    // 3. AI 분석 (옵션) - 비동기로 처리
    let finalItems = evaluatedItems;
    let aiAnalysisPromise = null;
    
    if (useAI && evaluatedItems.length > 0) {
      console.log('AI 분석 백그라운드 시작...');
      // 상위 3개만 AI 분석 (타임아웃 방지)
      const topItems = evaluatedItems
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(3, count));
      
      // AI 분석을 비동기로 시작하되 기다리지 않음
      aiAnalysisPromise = analyzeWithAI(topItems)
        .then(aiItems => {
          console.log('AI 분석 완료, DB 업데이트 예정');
          return aiItems;
        })
        .catch(error => {
          console.error('AI 분석 실패:', error);
          return null;
        });
    }
    
    // 4. 최종 선정 (상위 N개)
    const selectedItems = finalItems
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
    
    // 5. DB 저장 (우선 기본 점수로 저장)
    const savedItems = await saveSelectedItems(selectedItems);
    
    // 6. AI 분석 결과를 기다리고 DB 업데이트 (비동기)
    if (aiAnalysisPromise) {
      // AI 분석이 완료되면 DB 업데이트
      aiAnalysisPromise.then(async (aiItems) => {
        if (aiItems && aiItems.length > 0) {
          console.log('AI 분석 결과로 DB 업데이트 시작');
          for (const aiItem of aiItems) {
            const savedItem = savedItems.find(s => s.title === aiItem.title);
            if (savedItem) {
              await updateItemWithAIAnalysis(savedItem.id, aiItem);
            }
          }
        }
      });
    }
    
    // 7. 자동 모드인 경우 다음 단계 트리거
    if (mode === 'auto') {
      await triggerNextPhase(savedItems);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          collected: newsItems.length,
          selected: selectedItems.length,
          items: savedItems,
          aiAnalyzed: useAI,
          aiStatus: useAI ? 'processing' : 'skipped'
        },
        message: `${selectedItems.length}개의 콘텐츠 아이템이 선정되었습니다.${useAI ? ' AI 분석이 백그라운드에서 진행 중입니다.' : ''}`
      })
    };
    
  } catch (error) {
    console.error('뉴스 수집 오류:', error);
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

// 브랜드백과사전 검색 키워드 생성
function generateBrandSearchQueries() {
  // 브랜드백과사전에 적합한 검색어 조합
  const brandQueries = [
    // 브랜드 역사/스토리
    '브랜드 역사', '브랜드 창업', '브랜드 스토리', '로고 변천사', '브랜드 탄생',
    // 기업 관련
    '삼성 신제품', '애플 출시', 'LG 혁신', '현대자동차', '네이버 서비스',
    '카카오 플랫폼', '쿠팡 물류', '배달의민족', '스타벅스 한국',
    // 패션/뷰티
    '샤넬 컬렉션', '루이비통 협업', '나이키 신제품', '아디다스 캠페인',
    // 식품
    '코카콜라 마케팅', '맥도날드 메뉴', '농심 라면', 'CJ 신제품',
    // 브랜드 이슈
    '브랜드 콜라보', '한정판 출시', '리브랜딩', '브랜드 가치', '브랜드 순위'
  ];
  
  return brandQueries;
}

// 네이버 뉴스 수집 (브랜드 중심)
async function collectNewsFromNaver(category = null, limit = 30) {
  const newsItems = [];
  const categories = category ? [category] : Object.keys(NEWS_CATEGORIES);
  
  // 테스트 모드: 샘플 데이터 반환
  if (false) { // 실제 뉴스 수집 활성화
    const testItems = [
      {
        title: "AI가 바꾸는 미래: GPT-5 출시 임박, 세상은 어떻게 변할까?",
        summary: "OpenAI가 차세대 언어모델 GPT-5 출시를 앞두고 있다. 전문가들은 이번 모델이 인공지능 역사에 새로운 전환점이 될 것으로 전망한다.",
        link: "https://example.com/news1",
        imageUrl: null,
        press: "AI타임즈",
        time: "3시간 전",
        category: "innovation",
        categoryWeight: 0.2,
        collectedAt: new Date().toISOString()
      },
      {
        title: "화성 탐사선, 물의 흔적 발견... 생명체 존재 가능성은?",
        summary: "NASA의 화성 탐사선이 화성 지하에서 대규모 얼음층을 발견했다. 과학자들은 이것이 과거 생명체 존재의 증거가 될 수 있다고 설명한다.",
        link: "https://example.com/news2",
        imageUrl: null,
        press: "사이언스뉴스",
        time: "5시간 전",
        category: "science",
        categoryWeight: 0.25,
        collectedAt: new Date().toISOString()
      },
      {
        title: "한국 경제 성장률 3% 돌파, 그 비결은?",
        summary: "올해 한국 경제가 예상을 뛰어넘는 성장률을 기록했다. 전문가들은 반도체 수출 호조와 내수 회복을 주요 원인으로 꼽는다.",
        link: "https://example.com/news3",
        imageUrl: null,
        press: "경제일보",
        time: "7시간 전",
        category: "economy",
        categoryWeight: 0.2,
        collectedAt: new Date().toISOString()
      },
      {
        title: "조선시대 숨겨진 비밀문서 발견, 역사 다시 쓰이나",
        summary: "경복궁 복원 작업 중 발견된 고문서가 조선시대 정치사에 새로운 시각을 제공하고 있다.",
        link: "https://example.com/news4",
        imageUrl: null,
        press: "역사신문",
        time: "10시간 전",
        category: "history",
        categoryWeight: 0.2,
        collectedAt: new Date().toISOString()
      },
      {
        title: "Z세대의 새로운 소비 트렌드, '가치소비'가 뜬다",
        summary: "MZ세대가 단순한 가격이 아닌 브랜드의 가치와 철학을 보고 소비하는 경향이 강해지고 있다.",
        link: "https://example.com/news5",
        imageUrl: null,
        press: "트렌드매거진",
        time: "12시간 전",
        category: "society",
        categoryWeight: 0.15,
        collectedAt: new Date().toISOString()
      }
    ];
    
    return testItems.slice(0, limit);
  }
  
  // 중복 체크를 위한 Set
  const seenTitles = new Set();
  const seenLinks = new Set();
  
  // 브랜드 관련 검색어 생성
  const brandQueries = generateBrandSearchQueries();
  
  // 1. 먼저 브랜드 검색어로 뉴스 수집 (우선순위 높음)
  for (const query of brandQueries.slice(0, 10)) { // 상위 10개 검색어만 사용
    if (newsItems.length >= limit * 0.7) break; // 70%까지만 브랜드 검색으로 채움
    
    try {
      // 네이버 뉴스 검색 API 대신 검색 페이지 사용
      const searchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}&sort=0`; // sort=0: 관련도순
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KairosAI/1.0)'
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // 검색 결과 파싱
      const searchItems = $('.news_wrap.api_ani_send, .group_news > ul > li');
      
      searchItems.each((index, element) => {
        if (newsItems.length >= limit * 0.7) return false;
        if (index > 2) return false; // 각 검색어당 최대 3개
        
        const $item = $(element);
        const title = $item.find('.news_tit').text().trim() || $item.find('.api_txt_lines').text().trim();
        const summary = $item.find('.api_txt_lines.dsc_txt_wrap').text().trim() || $item.find('.news_dsc').text().trim();
        const link = $item.find('.news_tit').attr('href') || $item.find('a').first().attr('href');
        const press = $item.find('.info_group .press').text().trim() || $item.find('.sub_txt').first().text().trim();
        const time = $item.find('.info_group span').last().text().trim();
        const imageUrl = $item.find('img').first().attr('src');
        
        if (title && link && !seenTitles.has(title) && !seenLinks.has(link)) {
          seenTitles.add(title);
          seenLinks.add(link);
          
          newsItems.push({
            title,
            summary,
            link,
            imageUrl,
            press,
            time,
            category: 'brand',
            categoryWeight: 0.5, // 브랜드 검색 결과는 가중치 높음
            searchQuery: query,
            collectedAt: new Date().toISOString()
          });
        }
      });
      
    } catch (error) {
      console.error(`브랜드 검색 "${query}" 실패:`, error.message);
    }
  }
  
  console.log(`브랜드 검색으로 수집된 뉴스: ${newsItems.length}개`);
  
  // 2. 나머지는 카테고리별 일반 뉴스로 채움
  for (const cat of categories) {
    if (newsItems.length >= limit) break;
    
    try {
      const categoryInfo = NEWS_CATEGORIES[cat];
      const url = `https://news.naver.com/section/${categoryInfo.id}`;
      
      // 네이버 뉴스 HTML 가져오기
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KairosAI/1.0)'
        }
      });
      
      if (!response.ok) {
        console.log(`카테고리 ${cat} 응답 실패:`, response.status);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // 뉴스 아이템 파싱 - 네이버 뉴스 새로운 구조
      const items = $('div.sa_item, div.sa_item_flex, div[class*="sa_item"]');
      console.log(`카테고리 ${cat}에서 찾은 아이템: ${items.length}개`);
      
      items.each((index, element) => {
        if (newsItems.length >= limit) return false;
        
        const $item = $(element);
        const title = $item.find('.sa_text_title, .sa_text strong').text().trim();
        const summary = $item.find('.sa_text_lede, .sa_text').text().trim();
        const link = $item.find('a').first().attr('href');
        const imageUrl = $item.find('img').first().attr('src');
        const press = $item.find('.sa_text_press, .press').text().trim();
        const time = $item.find('.sa_text_datetime, .date').text().trim();
        
        if (title && link) {
          const fullLink = link.startsWith('http') ? link : `https://news.naver.com${link}`;
          
          // 중복 체크 (제목 또는 링크가 같으면 중복으로 처리)
          const normalizedTitle = title.replace(/\s+/g, ' ').trim();
          if (seenTitles.has(normalizedTitle) || seenLinks.has(fullLink)) {
            console.log(`중복 기사 제외: ${title.substring(0, 30)}...`);
            return; // 중복이면 건너뛰기
          }
          
          // Set에 추가
          seenTitles.add(normalizedTitle);
          seenLinks.add(fullLink);
          
          newsItems.push({
            title,
            summary,
            link: fullLink,
            imageUrl,
            press,
            time,
            category: categoryInfo.name,
            categoryWeight: categoryInfo.weight,
            collectedAt: new Date().toISOString()
          });
        }
      });
      
    } catch (error) {
      console.error(`카테고리 ${cat} 수집 실패:`, error);
    }
  }
  
  return newsItems;
}

// 브랜드백과사전 맞춤 콘텐츠 평가
function evaluateNewsItems(newsItems) {
  return newsItems.map(item => {
    // 브랜드백과사전 평가 사용
    const brandEvaluation = evaluateBrandContent(item);
    const text = `${item.title} ${item.summary || ''}`;
    
    // 브랜드백과사전 점수와 상세 평가
    let score = brandEvaluation.score;
    const reasons = [...brandEvaluation.details];
    
    // 브랜드 검색으로 수집된 뉴스는 가중치 추가
    if (item.searchQuery) {
      score += 30;
      reasons.push(`브랜드 검색 결과 (${item.searchQuery}): +30`);
    }
    
    // 추가 평가: 최신성
    const hoursAgo = getHoursAgo(item.time);
    if (hoursAgo <= 6) {
      score += 20;
      reasons.push('최신 뉴스(6시간 이내): +20');
    } else if (hoursAgo <= 12) {
      score += 10;
      reasons.push('오늘 뉴스(12시간 이내): +10');
    } else if (hoursAgo <= 24) {
      score += 5;
      reasons.push('어제 뉴스(24시간 이내): +5');
    }
    
    // 브랜드 이야기 요소 추가 평가
    const storyKeywords = ['창업', '역사', '혁신', '신제품', '콜라보', '한정판', '리브랜딩', '마케팅'];
    const matchedStoryKeywords = storyKeywords.filter(k => text.includes(k));
    if (matchedStoryKeywords.length > 0) {
      score += matchedStoryKeywords.length * 15;
      reasons.push(`브랜드 스토리 키워드 (${matchedStoryKeywords.join(', ')}): +${matchedStoryKeywords.length * 15}`);
    }
    
    // 부정적 키워드 감점 강화
    const negativeKeywords = ['사망', '사고', '범죄', '폭력', '논란', '비판', '갈등', '스캔들', '비리'];
    const matchedNegative = negativeKeywords.filter(k => text.includes(k));
    if (matchedNegative.length > 0) {
      score -= matchedNegative.length * 50;
      reasons.push(`부정적 키워드: -${matchedNegative.length * 50}`);
    }
    
    // 적합성 등급 결정 (브랜드백과사전 기준)
    let suitability = 'low';
    if (brandEvaluation.brands.length > 0 && score >= 120) {
      suitability = 'perfect'; // 브랜드 명확 + 높은 점수
    } else if (brandEvaluation.brands.length > 0 && score >= 80) {
      suitability = 'high';
    } else if (brandEvaluation.suitable && score >= 60) {
      suitability = 'medium';
    } else if (brandEvaluation.brands.length > 0) {
      suitability = 'low'; // 브랜드는 있지만 점수 낮음
    } else {
      suitability = 'none'; // 브랜드백과사전에 부적합
    }
    
    return {
      ...item,
      score: Math.max(0, score),
      evaluationReasons: reasons,
      suitability,
      brands: brandEvaluation.brands,
      interestLevel: brandEvaluation.interestLevel,
      isBrandContent: brandEvaluation.suitable
    };
  });
}

// 시간 계산 헬퍼
function getHoursAgo(timeStr) {
  // "3시간 전", "1일 전" 등의 형식 파싱
  if (timeStr.includes('분 전')) {
    return 0;
  } else if (timeStr.includes('시간 전')) {
    return parseInt(timeStr.match(/\d+/)[0]);
  } else if (timeStr.includes('일 전')) {
    return parseInt(timeStr.match(/\d+/)[0]) * 24;
  }
  return 24; // 기본값
}

// 선정된 아이템 DB 저장
async function saveSelectedItems(items) {
  const savedItems = [];
  
  // 먼저 기존 아이템들의 제목을 가져와서 중복 체크
  const { data: existingItems } = await supabaseAdmin
    .from('content_items')
    .select('title, source_url')
    .eq('source_type', 'news')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 최근 24시간
  
  const existingTitles = new Set(existingItems?.map(item => item.title.replace(/\s+/g, ' ').trim()) || []);
  const existingUrls = new Set(existingItems?.map(item => item.source_url) || []);
  
  for (const item of items) {
    try {
      // 중복 체크
      const normalizedTitle = item.title.replace(/\s+/g, ' ').trim();
      if (existingTitles.has(normalizedTitle) || existingUrls.has(item.link)) {
        console.log(`DB 저장 시 중복 제외: ${item.title.substring(0, 30)}...`);
        continue;
      }
      
      // AI 분석 결과 포함 여부 확인
      const hasAIAnalysis = item.isAIEnhanced && item.aiAnalysis;
      
      // content_items 테이블에 저장
      const { data, error } = await supabaseAdmin
        .from('content_items')
        .insert({
          title: item.title,
          summary: item.summary,
          source_url: item.link,
          source_type: 'news',
          category: item.category,
          thumbnail_url: item.imageUrl,
          
          // 점수 관련 (새로운 컬럼)
          score: item.finalScore || item.score || 0,  // 기존 호환성을 위해 score도 유지
          base_score: item.score || 0,  // 기본 키워드 점수
          ai_score: item.aiScore || 0,  // AI 분석 점수
          final_score: item.finalScore || item.score || 0,  // 최종 점수
          suitability: item.suitability,
          
          // AI 분석 관련 (새로운 컬럼)
          ai_analyzed: hasAIAnalysis,
          ai_model: hasAIAnalysis ? 'gemini-2.0-flash' : null,
          ai_analysis: hasAIAnalysis ? {
            detectedBrands: item.aiAnalysis.detectedBrands || [],
            relatedBrands: item.aiAnalysis.relatedBrands || [],
            storyAngles: item.aiAnalysis.storyAngles || [],
            hiddenFacts: item.aiAnalysis.hiddenFacts || [],
            contentIdeas: item.aiAnalysis.contentIdeas || [],
            trendRelevance: item.aiAnalysis.trendRelevance || {},
            brandEncyclopediaFit: item.aiAnalysis.brandEncyclopediaFit || {}
          } : {},
          analyzed_at: hasAIAnalysis ? new Date().toISOString() : null,
          
          // 메타데이터 (기존 구조 유지)
          metadata: {
            press: item.press,
            publishedAt: item.time,
            evaluationReasons: item.evaluationReasons,
            brands: item.brands || [],
            interestLevel: item.interestLevel || 'low',
            isBrandContent: item.isBrandContent || false
          },
          
          status: 'selected',
          workflow_stage: 'item_selection'
        })
        .select()
        .single();
      
      if (error) throw error;
      savedItems.push(data);
      
    } catch (error) {
      console.error('아이템 저장 실패:', error);
    }
  }
  
  return savedItems;
}

// 다음 단계 트리거
async function triggerNextPhase(items) {
  // 상위 3개 아이템에 대해 연구 단계 시작
  const topItems = items.slice(0, 3);
  
  for (const item of topItems) {
    try {
      // 연구 작업 생성
      await supabaseAdmin
        .from('agent_tasks')
        .insert({
          content_item_id: item.id,
          agent_type: 'researcher',
          task_type: 'research',
          status: 'pending',
          priority: item.score,
          parameters: {
            depth: 'comprehensive',
            sources: ['naver', 'google', 'academic'],
            keywords: item.metadata.keywords
          }
        });
      
    } catch (error) {
      console.error('연구 작업 생성 실패:', error);
    }
  }
}

// AI 분석 결과로 DB 아이템 업데이트
async function updateItemWithAIAnalysis(itemId, aiItem) {
  try {
    const { error } = await supabaseAdmin
      .from('content_items')
      .update({
        // AI 분석 관련 컬럼 업데이트
        ai_analyzed: true,
        ai_model: 'gemini-2.0-flash',
        ai_analysis: {
          detectedBrands: aiItem.aiAnalysis.detectedBrands || [],
          relatedBrands: aiItem.aiAnalysis.relatedBrands || [],
          storyAngles: aiItem.aiAnalysis.storyAngles || [],
          hiddenFacts: aiItem.aiAnalysis.hiddenFacts || [],
          contentIdeas: aiItem.aiAnalysis.contentIdeas || [],
          trendRelevance: aiItem.aiAnalysis.trendRelevance || {},
          brandEncyclopediaFit: aiItem.aiAnalysis.brandEncyclopediaFit || {}
        },
        ai_score: Math.round(aiItem.aiScore || 0),
        final_score: Math.round(aiItem.finalScore || aiItem.score || 0),
        analyzed_at: new Date().toISOString()
      })
      .eq('id', itemId);
    
    if (error) {
      console.error('AI 분석 결과 업데이트 실패:', error);
    } else {
      console.log(`아이템 ${itemId} AI 분석 업데이트 완료`);
    }
  } catch (error) {
    console.error('DB 업데이트 오류:', error);
  }
}

// AI 분석 함수
async function analyzeWithAI(newsItems) {
  try {
    // analyzeNewsWithAI 함수 호출
    const response = await fetch(`${process.env.URL || 'http://localhost:8888'}/.netlify/functions/analyzeNewsWithAI`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newsItems })
    });
    
    if (!response.ok) {
      throw new Error(`AI 분석 API 오류: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data.items;
    }
    
    throw new Error('AI 분석 결과 없음');
    
  } catch (error) {
    console.error('AI 분석 중 오류:', error);
    // 오류 시 원본 아이템 반환
    return newsItems;
  }
}