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

    // AI 모델 설정
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192,  // 짧은 스크립트용
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
    
    // production_sheets 테이블에 저장
    const scenesToInsert = analysisResult.scenes.map((scene, index) => ({
      project_id: projectId,
      scene_number: maxSceneNumber + 1 + index,
      original_script_text: scene.original_script_text || '',
      characters: scene.characters || [],
      backgrounds: [],
      props: [],
      director_guide: '',
      image_prompt: null,
      video_prompt: null
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
  return `스크립트를 분석하여 씬으로 나누고 캐릭터를 추출하세요.

규칙:
1. **매우 중요**: 원고의 모든 문장을 반드시 포함시켜야 함. 단 한 문장도 빠뜨리지 말 것
2. **씬 분할 원칙**:
   - 각 씬은 5-10초 분량 (1-2문장이 적당)
   - 의미적으로 완성된 단위로 분할
   - 한 문장 내에서는 특별한 이유가 없으면 나누지 말 것
3. 2회 이상 등장하는 인물만 캐릭터로 추출
4. **중요: "내레이터"는 캐릭터로 포함하지 말 것**
5. 모든 문장 포함, 누락 금지

JSON 형식:
{
  "scenes": [
    {
      "scene_number": 1,
      "original_script_text": "이 부분의 스크립트 내용",
      "characters": ["군인(1960년대 대한민국 남성)", "상인(1960년대 여성)"]
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
      if (!scene.scene_number) scene.scene_number = index + 1;
      if (!scene.original_script_text) {
        throw new Error(`씬 ${scene.scene_number}에 스크립트가 없습니다`);
      }
      if (!scene.characters) scene.characters = [];
    });
    
    return parsed;
  } catch (error) {
    console.error('JSON 파싱 실패:', error.message);
    throw new Error(`JSON 파싱 실패: ${error.message}`);
  }
}