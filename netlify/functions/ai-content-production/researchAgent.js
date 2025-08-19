// AI 콘텐츠 제작 - 연구 에이전트
// 선정된 뉴스 아이템에 대한 심층 연구 수행
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 세상의모든지식 채널 연구 가이드라인
const RESEARCH_GUIDELINES = {
  depth: 'comprehensive',
  style: 'educational',
  requirements: [
    '정확한 팩트 체크',
    '다양한 관점 수집',
    '시각화 가능한 데이터 포함',
    '스토리텔링 요소 발굴',
    '교육적 가치 극대화'
  ],
  sources: {
    primary: ['학술 논문', '공식 보고서', '전문가 인터뷰'],
    secondary: ['신뢰할 수 있는 뉴스', '위키피디아', '공식 웹사이트'],
    avoid: ['루머', '검증되지 않은 블로그', '편향된 소스']
  }
};

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
    const { contentItemId, newsData, depth = 'comprehensive' } = JSON.parse(event.body);
    
    console.log('연구 시작:', { contentItemId, depth });
    
    // 1. 연구 작업 생성 (agent_tasks 테이블)
    const { data: task, error: taskError } = await supabaseAdmin
      .from('agent_tasks')
      .insert({
        content_item_id: contentItemId,
        agent_type: 'researcher',
        task_type: 'research',
        status: 'in_progress',
        parameters: {
          depth,
          newsData,
          startedAt: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (taskError) throw taskError;
    
    // 2. AI를 활용한 연구 수행
    const researchPrompt = `
당신은 "세상의모든지식" YouTube 채널의 연구 전문가입니다.
채널 미션: "복잡한 세상을 쉽고 재미있게 설명하여 모든 사람이 지식에 접근할 수 있도록 한다"

다음 뉴스 아이템에 대해 심층 연구를 수행해주세요:

제목: ${newsData.title}
요약: ${newsData.summary}
카테고리: ${newsData.category}

연구 목표:
1. 핵심 사실과 배경 정보 수집
2. 일반인이 이해하기 쉬운 설명 방법 찾기
3. 시각화할 수 있는 데이터와 통계 발굴
4. 흥미로운 스토리텔링 요소 찾기
5. 관련된 역사적 사례나 유사 사례
6. 미래 전망과 시사점

출력 형식:
{
  "coreFacts": ["핵심 사실들"],
  "backgroundInfo": "배경 정보",
  "dataPoints": [{"label": "라벨", "value": "값", "context": "설명"}],
  "storyElements": ["스토리텔링 요소들"],
  "historicalContext": "역사적 맥락",
  "futureImplications": "미래 전망",
  "visualizationIdeas": ["시각화 아이디어들"],
  "keyTakeaways": ["핵심 메시지들"],
  "recommendedNarrative": "추천 내러티브 구조"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a research specialist for educational YouTube content. Provide accurate, well-researched information that can be explained to a general audience."
        },
        {
          role: "user",
          content: researchPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });
    
    const researchData = JSON.parse(completion.choices[0].message.content);
    
    // 3. 추가 연구: 웹 검색을 통한 팩트 체크 (선택적)
    let additionalData = {};
    if (depth === 'comprehensive') {
      additionalData = await performWebResearch(newsData.title);
    }
    
    // 4. 연구 결과 저장
    const researchResult = {
      ...researchData,
      additionalData,
      metadata: {
        researchDepth: depth,
        completedAt: new Date().toISOString(),
        tokenUsed: completion.usage?.total_tokens || 0,
        model: "gpt-4-turbo-preview"
      }
    };
    
    // 5. content_research 테이블에 저장
    const { data: research, error: researchError } = await supabaseAdmin
      .from('content_research')
      .insert({
        content_item_id: contentItemId,
        research_data: researchResult,
        agent_task_id: task.id,
        status: 'completed'
      })
      .select()
      .single();
    
    if (researchError) throw researchError;
    
    // 6. agent_tasks 상태 업데이트
    await supabaseAdmin
      .from('agent_tasks')
      .update({
        status: 'completed',
        result: researchResult,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id);
    
    // 7. 다음 단계 트리거 (원고 작성)
    await triggerScriptWriting(contentItemId, researchResult);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          taskId: task.id,
          researchId: research.id,
          research: researchResult
        },
        message: '연구가 완료되었습니다.'
      })
    };
    
  } catch (error) {
    console.error('연구 에이전트 오류:', error);
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

// 웹 검색을 통한 추가 연구
async function performWebResearch(query) {
  try {
    // 네이버 검색 API 또는 Google Search API 활용
    // 여기서는 간단한 예시
    const searchResults = {
      additionalFacts: [],
      relatedTopics: [],
      expertOpinions: [],
      statistics: []
    };
    
    // TODO: 실제 웹 검색 API 구현
    console.log('웹 검색 수행:', query);
    
    return searchResults;
  } catch (error) {
    console.error('웹 검색 실패:', error);
    return {};
  }
}

// 원고 작성 단계 트리거
async function triggerScriptWriting(contentItemId, researchData) {
  try {
    // 원고 작성 작업 생성
    const { data, error } = await supabaseAdmin
      .from('agent_tasks')
      .insert({
        content_item_id: contentItemId,
        agent_type: 'writer',
        task_type: 'script_writing',
        status: 'pending',
        priority: 90,
        parameters: {
          researchData,
          style: 'world-knowledge',
          targetLength: '8-12분'
        }
      });
    
    if (error) throw error;
    console.log('원고 작성 작업 생성됨:', data);
    
  } catch (error) {
    console.error('원고 작성 트리거 실패:', error);
  }
}