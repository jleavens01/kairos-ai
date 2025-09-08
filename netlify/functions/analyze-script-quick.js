// 빠른 스크립트 분석 함수 (짧은 스크립트용)
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    const { projectId, scriptText } = JSON.parse(event.body);
    
    if (!projectId || !scriptText) {
      throw new Error('projectId and scriptText are required');
    }

    // 스크립트 길이 체크 (5000자 이하만 즉시 처리)
    if (scriptText.length > 5000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: '스크립트가 너무 깁니다. 5000자 이하로 줄여주세요.' 
        })
      };
    }

    console.log(`Processing script for project ${projectId}, length: ${scriptText.length}`);

    // AI 모델 설정 - Gemini 2.5 Pro로 변경 (더 안정적)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 32768,  // 짧은 스크립트용 (충분한 여유)
      }
    });

    // AI 프롬프트 생성
    const prompt = generateAnalysisPrompt(scriptText);
    
    // AI 분석 실행 (동기적으로)
    console.log('Starting AI analysis...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log('AI response received, parsing...');
    
    // JSON 파싱
    const analysisResult = parseAIResponse(responseText);
    
    // 캐릭터 분석
    console.log('Analyzing characters from scenes...');
    const characterAnalysis = analyzeCharacters(analysisResult.scenes);
    console.log('Character analysis result:', {
      mainCharactersCount: characterAnalysis.mainCharacters.length,
      allCharactersCount: characterAnalysis.allCharacters.length,
      mainCharacters: characterAnalysis.mainCharacters.slice(0, 5) // 상위 5개만 로그
    });
    
    // 기존 production_sheets 조회
    const { data: existingSheets } = await supabase
      .from('production_sheets')
      .select('scene_number')
      .eq('project_id', projectId);
    
    const maxSceneNumber = existingSheets?.length > 0 
      ? Math.max(...existingSheets.map(item => item.scene_number || 0)) 
      : 0;
    
    // production_sheets 테이블에 저장 (새로운 구조)
    const scenesToInsert = analysisResult.scenes.map((scene, index) => ({
      project_id: projectId,
      scene_number: maxSceneNumber + 1 + index,
      original_script_text: scene.original_script_text || '',
      characters: scene.characters || [],
      backgrounds: scene.backgrounds || [],
      props: scene.props || [],
      director_guide: scene.director_guide || '',
      image_prompt: null,
      video_prompt: null,
      // metadata 필드에 추가 정보 저장 (JSONB)
      metadata: {
        scene_type: scene.scene_type || 'mixed',
        reference_sources: scene.reference_sources || [],
        analysis_version: '2.0',
        created_by_function: 'analyze-script-quick',
        ...scene.metadata
      }
    }));

    // 씬 데이터 저장
    const { error: scenesError } = await supabase
      .from('production_sheets')
      .insert(scenesToInsert);

    if (scenesError) {
      throw scenesError;
    }

    console.log(`Successfully processed ${scenesToInsert.length} scenes`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        data: {
          scenes: analysisResult.scenes,
          totalScenes: analysisResult.scenes.length,
          mainCharacters: characterAnalysis.mainCharacters,
          allCharacters: characterAnalysis.allCharacters
        }
      })
    };

  } catch (error) {
    console.error('Error in analyze-script-quick:', error);
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

// AI 프롬프트 생성 함수
function generateAnalysisPrompt(scriptText) {
  return `[역할 부여]
너는 최고의 다큐멘터리 감독이자 스토리보드 작가야. 텍스트로 된 시나리오를 그래픽과 애니메이션 중심의 시각적 연출안으로 재구성하는 데 매우 능숙해.

[목표 제시]
제공된 다큐멘터리 시나리오를 분석해서, 그래픽과 애니메이션의 비중이 매우 높은 '연출정리표'를 JSON 형식으로 제작해줘.

[핵심 작업 지시]

1. 시나리오 분절 (매우 중요!): 
   - 원고의 #숫자 구조는 완전히 무시하고, 3초에서 8초 내외의 아주 짧은 분량으로 세밀하게 장면을 나눠줘
   - 각 장면은 대략 30-80자 정도의 짧은 호흡 단위로 나누어야 해 (한 번에 읽을 수 있는 짧은 문장 단위)
   - 나레이션의 자연스러운 호흡과 쉼표, 마침표를 기준으로 잘게 나눠줘
   - 나눈 대본은 'original_script_text' 필드에 원문 그대로, 일절 수정 없이 모두 포함해야 해
   - 전체 스크립트가 빠짐없이 모든 장면에 포함되어야 하며, 원고의 큰 구조(#1, #2 등)에 얽매이지 말고 훨씬 더 작은 단위로 나눠줘
   - 수치나 통계와 관련된 내용은 반드시 그래픽으로 시각화할 수 있도록 장면을 나눠줘
   - 각 장면의 연출은 연관된 이전/이후 장면과 자연스럽게 연결되도록 해야 해
   - int나 인터뷰 라고 되어 있는 부분은 scene_type을 "interview"로 지정하고, 나레이션이 아닌 인터뷰어/인터뷰이의 대화로 간주해서 장면을 설정.
   - 자료영상의 경우 캐릭터, 배경, 소품을 모두 비워두고 scene_type을 "자료"로 지정.
   - 표나 그래프가 필요한 경우 scene_type을 "표&그래프"로 지정.
   - 애니메이션이 필요한 경우 scene_type에 "애니메이션"을 반드시 포함.
   - 애니메이션을 연출할때는 연계되는 이전/이후 장면을 고려하여 자연스럽게 연출하되 너무 과하게 복잡하면 오히려 이해도를 떨어뜨릴 수 있으니, 스토리를 가장 적절하게 보완하는 수준에서 최적으로 사용.
   - 애니메이션을 연출할 때 이야기를 이끌어가는 핵심 캐릭터가 있다면 반드시 그 캐릭터를 중심으로 연출.
   - 애니메이션이 필요한 장면은 반드시 그 이유를 director_guide에 상세히 설명.
   - 캐릭터 설정시에 괄호 안에 (실루엣)을 불필요하게 만들지 말 것.
   - 캐릭터가 등장하지 않는 장면도 있을 수 있음.
   - props가 없는 장면도 있을 수 있음.
   - backgrounds가 없는 장면도 있을 수 있음.


   2. 시각적 연출 제안:
   - 자료 영상의 제한적 사용: 현대에 일어난 상징적인 사건이나, 현존하는 인물/장소를 보여주어 현실감을 부여해야 할 때 가장 효과적인 방법이 자료이다. 반면 의미없는 자료는 전달력이 약하다. 그걸 잘 판단하여 제한적으로 사용.
   - 그래픽 중심: 스토리텔링 전개 방식, 추상적 개념, 복잡한 이론 설명은 자료영상 대신 애니메이션(모션그래픽)을 최우선으로 사용
   - 텍스트는 이미지 생성시 깨지는 문제가 있기 때문에 텍스트를 활용한 연출은 금지.
   - 지도를 활용한 연출은 아직 정확도가 떨어지기 때문에 연출 금지.

3. 에셋 상세 분석:
   - 캐릭터: 장면에 필요한 모든 인물 (국가, 시대, 성별, 역사적인 인물 등을 괄호 안에 간략히 표기)
   - 캐릭터 설정시 내용상 중복되는 인물이라면 일관성있게 사용. 
   - 하지만 동일 인물이라도 시대가 다르거나 역할이 다르면 별도의 캐릭터로 설정.
   - 배경: 특정 시대의 특정 장소가 필요한 경우에만 추출하기. 씬별로 배경은 하나로 제한
   - 소품/그래픽: 반드시 필요한 핵심 소품, 아이콘만 추출.

반드시 이 JSON 구조로 응답해줘:
{
  "scenes": [
    {
      "scene_number": 1,
      "scene_type": "표&그래프|자료|애니메이션",
      "original_script_text": "원본 스크립트 텍스트 (수정 금지)",
      "director_guide": "상세한 시각 연출 방안",
      "characters": ["존 왕 캐릭터(13세기 잉글랜드 군주)", "엘리자베스 2세(21세기 영국 여왕)"],
      "backgrounds": ["13세기 영국 전쟁터"],
      "props": ["마그나카르타 문서", "테크트리 UI", "타임라인 그래픽"],
      "reference_sources": ["Google, "Wikipedia","Commons", "Met Museum", "Europeana", "DPLA"]
    }
  ]
}

원고:
${scriptText}`;
}

// 캐릭터 분석 함수
function analyzeCharacters(scenes) {
  const characterMap = new Map();
  
  scenes.forEach(scene => {
    if (scene.characters && Array.isArray(scene.characters)) {
      scene.characters.forEach(character => {
        if (character && character !== '내레이터') {
          characterMap.set(character, (characterMap.get(character) || 0) + 1);
        }
      });
    }
  });
  
  const mainCharacters = [];
  const allCharacters = [];
  
  characterMap.forEach((count, character) => {
    allCharacters.push({ name: character, count });
    if (count >= 2) {
      mainCharacters.push({ name: character, count });
    }
  });
  
  mainCharacters.sort((a, b) => b.count - a.count);
  allCharacters.sort((a, b) => b.count - a.count);
  
  return {
    mainCharacters,
    allCharacters
  };
}

// AI 응답 파싱 함수
function parseAIResponse(responseText) {
  let jsonString = responseText;
  
  // 마크다운 코드 블록 제거
  if (jsonString.includes('```json')) {
    const jsonStart = jsonString.indexOf('```json') + 7;
    const jsonEnd = jsonString.lastIndexOf('```');
    if (jsonEnd > jsonStart) {
      jsonString = jsonString.substring(jsonStart, jsonEnd).trim();
    }
  } else if (jsonString.includes('```')) {
    const jsonStart = jsonString.indexOf('```') + 3;
    const jsonEnd = jsonString.lastIndexOf('```');
    if (jsonEnd > jsonStart) {
      jsonString = jsonString.substring(jsonStart, jsonEnd).trim();
    }
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error('scenes 배열이 없습니다');
    }
    
    parsed.scenes.forEach((scene, index) => {
      // 기본 필드 검증 및 기본값 설정
      if (!scene.scene_number) scene.scene_number = index + 1;
      if (!scene.original_script_text) {
        throw new Error(`씬 ${scene.scene_number}에 스크립트가 없습니다`);
      }
      
      // 새로운 필드들 기본값 설정
      if (!scene.scene_type) scene.scene_type = 'mixed';
      if (!scene.director_guide) scene.director_guide = '';
      if (!scene.characters) scene.characters = [];
      if (!scene.backgrounds) scene.backgrounds = [];
      if (!scene.props) scene.props = [];
      if (!scene.reference_sources) scene.reference_sources = [];
      
      // metadata 구성 (추가 정보들을 JSON으로 저장)
      scene.metadata = {
        scene_type: scene.scene_type,
        reference_sources: scene.reference_sources,
        analysis_version: '2.0'
      };
    });
    
    return parsed;
  } catch (error) {
    console.error('JSON 파싱 실패:', error.message);
    throw new Error(`JSON 파싱 실패: ${error.message}`);
  }
}