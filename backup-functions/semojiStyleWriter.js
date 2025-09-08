// 세모지 스타일 원고 작성 AI 에이전트
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 세모지 페르소나 정의
const SEMOJI_PERSONA = {
  role: "system",
  content: `당신은 유튜브 채널 '세상의모든지식(세모지)'의 전문 작가입니다.
  
  당신의 특징:
  - 복잡한 지식을 쉽고 재미있게 풀어내는 스토리텔러
  - 깊이 있는 리서치와 팩트체크에 철저함
  - 청자와 감정적 연결을 만드는 따뜻한 화자
  
  작성 스타일:
  1. 도입부: 호기심을 자극하는 질문이나 놀라운 사실로 시작
  2. 경어체 사용: "~입니다", "~인데요", "~죠"
  3. 청자 포함: "우리가", "여러분도"
  4. 감정 표현: "놀랍게도", "흥미롭게도"
  5. 스토리텔링: 단순 정보 전달이 아닌 이야기로 풀어내기
  
  반드시 포함할 요소:
  - 구체적인 숫자와 데이터
  - 일상과 연결된 비유
  - 역사적 맥락이나 배경
  - 현재와 미래에 대한 통찰
  - 감정적 공감 포인트`
};

// 세모지 스타일 예시 (Few-shot learning)
const SEMOJI_EXAMPLES = [
  {
    topic: "애플의 성공 비결",
    intro: "1997년, 애플은 파산 직전이었습니다. 그런데 불과 25년 후, 세계에서 가장 가치 있는 기업이 되었죠. 도대체 무슨 일이 있었던 걸까요?",
    style_notes: "충격적 대비로 시작, 시간의 흐름 강조"
  },
  {
    topic: "스타벅스의 철학",
    intro: "여러분은 스타벅스에서 커피를 사신 적 있으신가요? 그런데 하워드 슐츠는 커피를 팔려고 한 게 아니었습니다. 그가 정말로 팔고 싶었던 것은...",
    style_notes: "일상적 경험 연결, 반전 활용"
  }
];

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
    const { topic, research, contentType = 'script' } = JSON.parse(event.body || '{}');
    
    console.log('세모지 스타일 원고 작성 시작:', { topic, contentType });
    
    let result;
    
    switch (contentType) {
      case 'script':
        result = await generateFullScript(topic, research);
        break;
      case 'intro':
        result = await generateIntro(topic, research);
        break;
      case 'storyboard':
        result = await generateStoryboard(topic, research);
        break;
      default:
        result = await generateFullScript(topic, research);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };
    
  } catch (error) {
    console.error('원고 작성 실패:', error);
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

// 전체 스크립트 생성
async function generateFullScript(topic, research) {
  const prompt = `
주제: ${topic}

리서치 자료:
${JSON.stringify(research, null, 2)}

위 주제와 자료를 바탕으로 세모지 스타일의 10-15분 분량 유튜브 스크립트를 작성해주세요.

구조:
1. 도입부 (1-2분): 강력한 훅과 주제 소개
2. 배경 설명 (2-3분): 역사적 맥락과 기본 정보
3. 핵심 내용 (5-7분): 깊이 있는 분석과 흥미로운 에피소드
4. 인사이트 (2-3분): 현재와 미래에 대한 통찰
5. 마무리 (1분): 핵심 메시지 정리와 감동적 클로징

세모지 스타일 체크리스트:
- [ ] 호기심 자극하는 도입부
- [ ] 구체적 숫자와 데이터
- [ ] 감정적 연결 포인트
- [ ] 일상적 비유 활용
- [ ] "그런데", "놀랍게도" 등 전환구
- [ ] 경어체와 청자 포함 표현

JSON 형식으로 응답:
{
  "title": "영상 제목",
  "hook": "도입부 훅 (첫 30초)",
  "script": {
    "intro": "도입부 전체",
    "background": "배경 설명",
    "main": "핵심 내용",
    "insight": "인사이트",
    "conclusion": "마무리"
  },
  "keywords": ["핵심 키워드"],
  "emotions": {
    "intro": "호기심",
    "main": "놀라움",
    "conclusion": "감동"
  },
  "visualCues": ["필요한 시각 자료"],
  "duration": "예상 시간(분)"
}`;

  return await callAI(prompt);
}

// 도입부만 생성
async function generateIntro(topic, research) {
  const prompt = `
주제: ${topic}

세모지 스타일로 강력한 도입부(1-2분)를 작성해주세요.

예시 참고:
${SEMOJI_EXAMPLES.map(ex => `- ${ex.topic}: "${ex.intro}"`).join('\n')}

요구사항:
1. 첫 문장에서 즉시 호기심 자극
2. 놀라운 사실이나 통계 제시
3. 청자와의 연결점 만들기
4. 오늘 다룰 내용 예고

JSON 응답:
{
  "hook": "첫 30초 훅",
  "intro": "전체 도입부",
  "curiosityPoints": ["호기심 포인트들"],
  "promisedValue": "시청자가 얻을 가치"
}`;

  return await callAI(prompt);
}

// 스토리보드 생성
async function generateStoryboard(topic, script) {
  const prompt = `
스크립트를 바탕으로 세모지 스타일 스토리보드를 생성해주세요.

주제: ${topic}
스크립트: ${JSON.stringify(script, null, 2)}

세모지 비주얼 스타일:
- 깔끔하고 현대적인 디자인
- 정보 전달에 최적화된 인포그래픽
- 감정을 자극하는 이미지
- 브랜드 일관성 유지

JSON 응답:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "0:00-0:30",
      "scriptPart": "해당 스크립트",
      "visualDescription": "시각적 설명",
      "imagePrompt": "AI 이미지 생성 프롬프트",
      "animationType": "fade|cut|zoom",
      "overlayText": "화면 텍스트",
      "emotion": "전달할 감정"
    }
  ],
  "totalScenes": 20,
  "estimatedDuration": "12:30"
}`;

  return await callAI(prompt);
}

// AI 호출 함수
async function callAI(prompt) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          SEMOJI_PERSONA,
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
    
  } catch (error) {
    console.error('AI 호출 실패:', error);
    throw error;
  }
}

// 스크립트 DB 저장
async function saveScript(scriptData) {
  const { data, error } = await supabaseAdmin
    .from('content_scripts')
    .insert({
      topic: scriptData.topic,
      script: scriptData.script,
      metadata: {
        duration: scriptData.duration,
        keywords: scriptData.keywords,
        emotions: scriptData.emotions,
        visualCues: scriptData.visualCues
      },
      status: 'draft',
      created_at: new Date()
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}