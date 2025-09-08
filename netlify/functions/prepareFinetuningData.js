// 세모지 스타일 파인튜닝 데이터 준비
// OpenAI Fine-tuning 또는 오픈소스 모델 학습용 데이터셋 생성

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    const { format = 'openai', includeExamples = true } = JSON.parse(event.body || '{}');
    
    console.log(`파인튜닝 데이터 준비 시작 (형식: ${format})`);
    
    // 세모지 스타일 학습 데이터 수집
    const trainingData = await collectTrainingData();
    
    // 포맷에 따라 데이터 변환
    let formattedData;
    switch (format) {
      case 'openai':
        formattedData = formatForOpenAI(trainingData, includeExamples);
        break;
      case 'gemini':
        formattedData = formatForGemini(trainingData, includeExamples);
        break;
      case 'llama':
        formattedData = formatForLlama(trainingData, includeExamples);
        break;
      default:
        formattedData = formatForOpenAI(trainingData, includeExamples);
    }
    
    // 데이터 검증
    const validation = validateTrainingData(formattedData, format);
    
    // DB에 저장 (선택사항)
    await saveTrainingDataset(formattedData, format);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          format: format,
          examples: formattedData.length,
          totalTokens: calculateTokens(formattedData),
          estimatedCost: calculateCost(formattedData, format),
          validation: validation,
          dataset: formattedData.slice(0, 3), // 처음 3개 예시만 반환
          downloadUrl: await generateDownloadUrl(formattedData, format)
        }
      })
    };
    
  } catch (error) {
    console.error('파인튜닝 데이터 준비 실패:', error);
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

// 학습 데이터 수집
async function collectTrainingData() {
  // 실제 세모지 원고 예시들
  const semojiExamples = [
    {
      topic: "스타벅스의 제3의 공간 철학",
      intro: "여러분은 스타벅스에서 커피를 사신 적 있으신가요? 그런데 하워드 슐츠는 커피를 팔려고 한 게 아니었습니다. 그가 정말로 팔고 싶었던 것은 '제3의 공간'이었죠.",
      style: "질문 시작, 반전 활용, 핵심 개념 제시",
      fullScript: `여러분은 스타벅스에서 커피를 사신 적 있으신가요? 그런데 하워드 슐츠는 커피를 팔려고 한 게 아니었습니다. 그가 정말로 팔고 싶었던 것은 '제3의 공간'이었죠.

1971년, 시애틀의 파이크 플레이스 마켓. 제리 볼드윈, 지브 시글, 고든 보커 세 명의 친구가 작은 커피 원두 가게를 열었습니다. 당시 이름은 '스타벅스 커피, 티, 스파이스'였죠. 하지만 이들은 단순히 원두만 팔았을 뿐, 커피를 내려서 파는 일은 하지 않았습니다.

그런데 1982년, 운명적인 만남이 일어납니다. 뉴욕에서 온 한 청년이 스타벅스에 합류하게 되는데요, 바로 하워드 슐츠였습니다. 놀랍게도 그는 이탈리아 출장에서 본 에스프레소 바 문화에 완전히 매료되었죠.

"사람들이 단순히 커피를 마시는 게 아니라, 대화를 나누고, 신문을 읽고, 친구를 만나는 공간. 집도 아니고 직장도 아닌, 제3의 공간." 

슐츠는 이 개념을 미국에 가져오고 싶었습니다. 하지만 창업자들은 반대했죠. "우리는 원두를 파는 회사야, 카페가 아니라고."

결국 슐츠는 1985년 스타벅스를 떠나 자신만의 카페 '일 지오날레'를 열었습니다. 그리고 놀랍게도 2년 후, 그는 스타벅스를 인수하게 됩니다. 380만 달러, 당시로서는 큰 돈이었죠.

그리고 여기서부터 진짜 혁명이 시작됩니다...`
    },
    {
      topic: "애플의 부활 스토리",
      intro: "1997년, 애플은 파산 직전이었습니다. 그런데 불과 25년 후, 세계에서 가장 가치 있는 기업이 되었죠. 도대체 무슨 일이 있었던 걸까요?",
      style: "시간적 대비, 극적 전환, 질문 유도",
      fullScript: `1997년, 애플은 파산 직전이었습니다. 그런데 불과 25년 후, 세계에서 가장 가치 있는 기업이 되었죠. 도대체 무슨 일이 있었던 걸까요?

당시 애플의 상황은 정말 암울했습니다. 시장 점유율 3%, 주가는 바닥, 90일 후면 파산할 거라는 예측까지 나왔죠. 마이크로소프트의 윈도우가 세상을 지배하고 있었고, 애플은 그저 특이한 취향을 가진 소수만 사용하는 컴퓨터 회사였습니다.

그때, 12년 전 쫓겨났던 한 남자가 돌아옵니다. 스티브 잡스.

"애플이 이기려면 마이크로소프트가 져야 한다는 생각을 버려야 합니다. 애플이 이기려면, 애플이 정말 좋은 일을 해야 합니다."

잡스의 첫 번째 결정은 충격적이었습니다. 수십 개의 제품 라인을 단 4개로 줄인 것이죠. 데스크톱과 노트북, 각각 일반용과 프로용. 그게 전부였습니다.

그리고 1998년, 반투명 컬러풀한 컴퓨터 iMac이 등장합니다. "Think Different" 캠페인과 함께요.

"미친 사람들, 부적응자들, 반항아들, 문제아들... 그들은 세상을 바꿉니다."

흥미롭게도, 이 광고에는 제품이 하나도 나오지 않았습니다. 대신 아인슈타인, 간디, 마틴 루터 킹, 피카소가 나왔죠...`
    },
    {
      topic: "나이키 Just Do It의 탄생",
      intro: "Just Do It. 이 짧은 세 단어가 어떻게 전 세계 수십억 명의 마음을 움직이게 되었을까요?",
      style: "상징적 문구 시작, 규모 강조, 호기심 유발",
      fullScript: `Just Do It. 이 짧은 세 단어가 어떻게 전 세계 수십억 명의 마음을 움직이게 되었을까요?

1988년, 나이키는 위기에 빠져 있었습니다. 리복에게 1위 자리를 빼앗긴 지 2년. 에어로빅 붐을 놓친 나이키는 '남성적이고 공격적인' 이미지에 갇혀 있었죠.

광고 대행사 와이든+케네디의 댄 와이든은 고민에 빠졌습니다. 어떻게 하면 나이키를 모든 사람의 브랜드로 만들 수 있을까?

그러던 어느 날, 그는 충격적인 뉴스를 봅니다. 사형수 게리 길모어의 마지막 말. "Let's do it."

"모든 사람 내면에는 무언가를 하고 싶은 욕구가 있다. 하지만 대부분은 핑계를 찾는다. 날씨가, 시간이, 돈이... 그냥 하면 되는데."

Just Do It은 단순한 슬로건이 아니었습니다. 인간의 본능에 대한 선언이었죠.

첫 광고는 80세 노인 월트 스택이 금문교를 달리는 모습이었습니다. "매일 17마일을 달려요. 사람들은 나보고 미쳤다고 하죠. 하지만 전 아직 살아있어요."

놀랍게도, 캠페인 첫 해에 나이키 매출은 9억 달러에서 17억 달러로 뛰어올랐습니다...`
    }
  ];
  
  // DB에서 추가 데이터 수집 (있다면)
  const { data: dbExamples } = await supabaseAdmin
    .from('semoji_training_data')
    .select('*')
    .limit(100);
  
  const allExamples = [...semojiExamples];
  if (dbExamples) {
    allExamples.push(...dbExamples);
  }
  
  return allExamples;
}

// OpenAI 형식으로 포맷팅
function formatForOpenAI(data, includeExamples) {
  const systemPrompt = `당신은 유튜브 채널 '세상의모든지식(세모지)'의 전문 작가입니다.

특징:
- 복잡한 지식을 쉽고 재미있게 풀어내는 스토리텔러
- 호기심을 자극하는 도입부
- 구체적 숫자와 데이터 활용
- 일상과 연결된 비유
- 감정적 공감 포인트

스타일:
- 경어체 사용 ("~입니다", "~인데요", "~죠")
- 청자 포함 표현 ("우리가", "여러분도")
- 전환구 활용 ("그런데", "놀랍게도", "흥미롭게도")`;
  
  const examples = data.map(item => ({
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `주제: ${item.topic}\n\n세모지 스타일로 10-15분 분량의 유튜브 스크립트를 작성해주세요.`
      },
      {
        role: "assistant",
        content: item.fullScript || generateFullScript(item)
      }
    ]
  }));
  
  if (includeExamples) {
    // Few-shot 예시 추가
    examples.push(...generateAdditionalExamples());
  }
  
  return examples;
}

// Gemini 형식으로 포맷팅
function formatForGemini(data, includeExamples) {
  return data.map(item => ({
    text_input: `주제: ${item.topic}\n\n세모지 스타일 특징:\n- ${item.style}\n\n세모지 스타일로 유튜브 스크립트를 작성해주세요.`,
    output: item.fullScript || generateFullScript(item)
  }));
}

// Llama 형식으로 포맷팅
function formatForLlama(data, includeExamples) {
  const formatted = data.map(item => {
    const instruction = "세모지 스타일로 유튜브 스크립트를 작성하세요.";
    const input = `주제: ${item.topic}`;
    const output = item.fullScript || generateFullScript(item);
    
    return {
      instruction,
      input,
      output
    };
  });
  
  return formatted;
}

// 전체 스크립트 생성 (예시용)
function generateFullScript(item) {
  return `${item.intro}

[배경 설명]
...

[핵심 내용]
...

[인사이트]
...

[마무리]
오늘도 새로운 지식과 함께 하셨길 바랍니다. 다음에도 더 흥미로운 이야기로 찾아뵙겠습니다.`;
}

// 추가 예시 생성
function generateAdditionalExamples() {
  return [
    {
      messages: [
        {
          role: "system",
          content: "세모지 스타일 작가"
        },
        {
          role: "user", 
          content: "테슬라의 혁신에 대해 설명해주세요"
        },
        {
          role: "assistant",
          content: "2003년, 두 명의 엔지니어가 실리콘밸리의 작은 창고에서 전기차를 만들기 시작했습니다. 모두가 불가능하다고 했죠. 그런데 20년 후, 테슬라는 세계 자동차 산업을 완전히 뒤바꿔 놓았습니다..."
        }
      ]
    }
  ];
}

// 토큰 계산
function calculateTokens(data) {
  // 간단한 추정: 한글 3자 = 1토큰, 영문 4자 = 1토큰
  let totalTokens = 0;
  
  data.forEach(item => {
    const text = JSON.stringify(item);
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    
    totalTokens += Math.ceil(koreanChars / 3) + Math.ceil(englishChars / 4);
  });
  
  return totalTokens;
}

// 비용 계산
function calculateCost(data, format) {
  const tokens = calculateTokens(data);
  
  const costs = {
    openai: {
      training: 0.008, // $0.008 per 1K tokens
      usage: 0.012 // $0.012 per 1K tokens
    },
    gemini: {
      training: 0.004, // 추정
      usage: 0.001
    },
    llama: {
      training: 0, // 오픈소스
      usage: 0 // 자체 호스팅
    }
  };
  
  const cost = costs[format] || costs.openai;
  
  return {
    trainingCost: `$${((tokens / 1000) * cost.training).toFixed(2)}`,
    estimatedUsageCost: `$${((tokens / 1000) * cost.usage).toFixed(2)}/1K requests`,
    totalTokens: tokens
  };
}

// 데이터 검증
function validateTrainingData(data, format) {
  const validation = {
    valid: true,
    warnings: [],
    errors: []
  };
  
  // 최소 데이터 개수 체크
  if (data.length < 10) {
    validation.warnings.push("학습 데이터가 10개 미만입니다. 최소 50개 이상 권장");
  }
  
  // 포맷별 검증
  if (format === 'openai') {
    data.forEach((item, index) => {
      if (!item.messages || item.messages.length < 2) {
        validation.errors.push(`Example ${index}: messages 형식 오류`);
        validation.valid = false;
      }
    });
  }
  
  // 중복 체크
  const seen = new Set();
  data.forEach((item, index) => {
    const key = JSON.stringify(item).substring(0, 100);
    if (seen.has(key)) {
      validation.warnings.push(`Example ${index}: 중복 가능성`);
    }
    seen.add(key);
  });
  
  return validation;
}

// 학습 데이터셋 저장
async function saveTrainingDataset(data, format) {
  const { error } = await supabaseAdmin
    .from('training_datasets')
    .insert({
      name: `semoji_style_${format}_${Date.now()}`,
      format: format,
      data: data,
      examples_count: data.length,
      tokens: calculateTokens(data),
      created_at: new Date()
    });
  
  if (error) {
    console.error('데이터셋 저장 실패:', error);
  }
}

// 다운로드 URL 생성
async function generateDownloadUrl(data, format) {
  // JSONL 형식으로 변환
  let content;
  
  if (format === 'openai') {
    content = data.map(item => JSON.stringify(item)).join('\n');
  } else {
    content = JSON.stringify(data, null, 2);
  }
  
  // Supabase Storage에 임시 저장
  const fileName = `training_data_${format}_${Date.now()}.jsonl`;
  const { data: uploadData, error } = await supabaseAdmin
    .storage
    .from('training-datasets')
    .upload(fileName, content, {
      contentType: 'application/jsonl',
      cacheControl: '3600'
    });
  
  if (error) {
    console.error('파일 업로드 실패:', error);
    return null;
  }
  
  // 공개 URL 생성
  const { data: { publicUrl } } = supabaseAdmin
    .storage
    .from('training-datasets')
    .getPublicUrl(fileName);
  
  return publicUrl;
}