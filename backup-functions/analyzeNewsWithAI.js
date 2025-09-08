// AI 기반 뉴스 분석 및 브랜드 스토리 도출
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GENERATIVE_LANGUAGE_API_KEY);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { newsItems } = JSON.parse(event.body || '{}');
    
    if (!newsItems || !Array.isArray(newsItems)) {
      throw new Error('newsItems array is required');
    }

    console.log(`AI 분석 시작: ${newsItems.length}개 뉴스`);
    
    // Gemini 2.5 Pro 모델 사용
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    const analyzedItems = [];
    
    for (const item of newsItems) {
      try {
        // AI 분석 프롬프트
        const prompt = `
당신은 "세상의모든지식" 채널의 브랜드백과사전 콘텐츠 기획자입니다.
다음 뉴스를 분석하여 흥미로운 브랜드 스토리와 콘텐츠 아이디어를 도출해주세요.

뉴스 제목: ${item.title}
뉴스 요약: ${item.summary || ''}
카테고리: ${item.category}

다음 관점에서 분석해주세요:

1. 직접 언급된 브랜드와 연관 브랜드 찾기
2. 이 뉴스에서 도출할 수 있는 브랜드 스토리 (역사, 창업, 혁신, 경쟁, 비하인드)
3. 대중이 모르는 흥미로운 사실이나 에피소드
4. "세상의모든지식" 채널에 적합한 콘텐츠 아이디어 (10-15분 분량)
5. 트렌드와 시의성 (왜 지금 이 스토리가 중요한가?)

JSON 형식으로 답변해주세요:
{
  "detectedBrands": ["직접 언급된 브랜드"],
  "relatedBrands": ["연관 브랜드"],
  "storyAngles": [
    {
      "type": "history|innovation|competition|founder|product",
      "title": "스토리 제목",
      "description": "스토리 설명"
    }
  ],
  "hiddenFacts": ["대중이 모르는 사실들"],
  "contentIdeas": [
    {
      "title": "콘텐츠 제목",
      "description": "콘텐츠 설명",
      "estimatedViews": "예상 조회수 범위",
      "targetAudience": "타겟 시청자"
    }
  ],
  "trendRelevance": {
    "score": 0-100,
    "reason": "시의성 설명"
  },
  "brandEncyclopediaFit": {
    "score": 0-100,
    "reason": "브랜드백과사전 적합성 설명"
  }
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // JSON 파싱
        let analysis;
        try {
          // JSON 블록 추출 (```json ... ``` 형식 처리)
          const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            throw new Error('JSON 파싱 실패');
          }
        } catch (parseError) {
          console.error('JSON 파싱 오류:', parseError);
          analysis = {
            detectedBrands: [],
            relatedBrands: [],
            storyAngles: [],
            hiddenFacts: [],
            contentIdeas: [],
            trendRelevance: { score: 0, reason: 'AI 분석 실패' },
            brandEncyclopediaFit: { score: 0, reason: 'AI 분석 실패' }
          };
        }

        // 최종 점수 계산 (AI 분석 + 기존 점수)
        const aiScore = (analysis.trendRelevance.score + analysis.brandEncyclopediaFit.score) / 2;
        const finalScore = Math.round((item.score || 0) * 0.3 + aiScore * 0.7);

        analyzedItems.push({
          ...item,
          aiAnalysis: analysis,
          aiScore: aiScore,
          finalScore: finalScore,
          isAIEnhanced: true,
          analyzedAt: new Date().toISOString()
        });

        // API 제한 고려하여 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`아이템 분석 실패:`, error);
        analyzedItems.push({
          ...item,
          aiAnalysis: null,
          aiScore: 0,
          finalScore: item.score || 0,
          isAIEnhanced: false,
          error: error.message
        });
      }
    }

    // 최종 점수로 정렬
    analyzedItems.sort((a, b) => b.finalScore - a.finalScore);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          analyzed: analyzedItems.length,
          items: analyzedItems
        },
        message: `${analyzedItems.length}개 뉴스 AI 분석 완료`
      })
    };

  } catch (error) {
    console.error('AI 분석 오류:', error);
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

// 브랜드 연관성 확장 함수
function expandBrandRelations(brands) {
  const brandRelations = {
    '삼성': ['LG', '현대', 'SK', '애플', '화웨이'],
    '애플': ['구글', '마이크로소프트', '삼성', '메타', '아마존'],
    '네이버': ['카카오', '구글', '쿠팡', '라인'],
    '카카오': ['네이버', '토스', '배민', '쿠팡'],
    '테슬라': ['현대', '기아', 'BYD', '리비안', '폭스바겐'],
    '스타벅스': ['투썸플레이스', '이디야', '메가커피', '컴포즈'],
    '맥도날드': ['버거킹', 'KFC', '롯데리아', '맘스터치'],
    '넷플릭스': ['디즈니플러스', '왓챠', '티빙', '웨이브', '쿠팡플레이'],
    'CJ': ['롯데', '농심', '오뚜기', 'SPC'],
    '현대': ['기아', '제네시스', '토요타', 'BMW', '벤츠']
  };

  const relatedBrands = new Set();
  
  brands.forEach(brand => {
    if (brandRelations[brand]) {
      brandRelations[brand].forEach(related => relatedBrands.add(related));
    }
  });

  return Array.from(relatedBrands);
}

// 스토리 잠재력 계산
function calculateStoryPotential(analysis) {
  let potential = 0;
  
  // 스토리 앵글 다양성
  if (analysis.storyAngles && analysis.storyAngles.length > 0) {
    potential += analysis.storyAngles.length * 10;
  }
  
  // 숨은 사실 존재
  if (analysis.hiddenFacts && analysis.hiddenFacts.length > 0) {
    potential += analysis.hiddenFacts.length * 15;
  }
  
  // 콘텐츠 아이디어 품질
  if (analysis.contentIdeas && analysis.contentIdeas.length > 0) {
    potential += analysis.contentIdeas.length * 20;
  }
  
  // 브랜드 다양성
  const totalBrands = (analysis.detectedBrands?.length || 0) + (analysis.relatedBrands?.length || 0);
  potential += Math.min(totalBrands * 5, 30);
  
  return Math.min(potential, 100);
}