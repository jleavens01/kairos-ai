// 씬 분할 전용 함수 (캐릭터 추출 없음)
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // 인증 확인
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);

    // 요청 데이터 파싱
    const { scriptText, projectId } = JSON.parse(event.body);
    
    if (!scriptText || !projectId) {
      throw new Error('Script text and project ID are required');
    }

    console.log(`Processing script for project ${projectId}, length: ${scriptText.length}`);

    // Gemini AI 초기화
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 8192,
      }
    });

    // AI 프롬프트 생성 (씬 분할만)
    const prompt = generateSplitPrompt(scriptText);
    
    // AI 분석 실행
    console.log('Starting scene splitting...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log('AI response received, parsing...');
    
    // JSON 파싱
    const splitResult = parseAIResponse(responseText);
    
    // 기존 production_sheets 조회
    const { data: existingSheets } = await supabase
      .from('production_sheets')
      .select('scene_number')
      .eq('project_id', projectId);
    
    const maxSceneNumber = existingSheets?.length > 0 
      ? Math.max(...existingSheets.map(item => item.scene_number || 0)) 
      : 0;
    
    // production_sheets 테이블에 저장 (캐릭터 정보 없이)
    const scenesToInsert = splitResult.scenes.map((scene, index) => ({
      project_id: projectId,
      scene_number: maxSceneNumber + 1 + index,
      original_script_text: scene.original_script_text || '',
      characters: [], // 캐릭터는 나중에 추출
      backgrounds: [],
      props: [],
      director_guide: '',
      image_prompt: null,
      video_prompt: null,
      metadata: {
        scene_title: scene.scene_title || null,
        duration_estimate: scene.duration_estimate || '5-10초'
      }
    }));

    // 씬 데이터 저장
    const { data: insertedScenes, error: scenesError } = await supabase
      .from('production_sheets')
      .insert(scenesToInsert)
      .select();

    if (scenesError) {
      throw scenesError;
    }

    console.log(`Successfully split into ${scenesToInsert.length} scenes`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: `${scenesToInsert.length}개의 씬으로 분할 완료`,
        data: {
          scenes: insertedScenes,
          totalScenes: scenesToInsert.length
        }
      })
    };

  } catch (error) {
    console.error('Error in split-scenes:', error);
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

// 씬 분할 전용 프롬프트
function generateSplitPrompt(scriptText) {
  return `다음 스크립트를 영상 제작을 위한 씬으로 나누어주세요.

규칙:
1. **매우 중요**: 원고의 모든 문장을 반드시 포함시켜야 함. 단 한 문장도 빠뜨리지 말 것
2. **씬 분할 원칙**:
   - 각 씬은 5-10초 분량 (1-2문장이 적당)
   - 의미적으로 완성된 단위로 분할
   - 장면 전환이 필요한 곳에서 분할
   - 한 문장 내에서는 특별한 이유가 없으면 나누지 말 것
3. 각 씬에 간단한 제목을 붙여주세요
4. 예상 재생 시간을 추정해주세요

JSON 형식으로만 응답하세요:
{
  "scenes": [
    {
      "scene_number": 1,
      "scene_title": "씬 제목",
      "original_script_text": "이 부분의 스크립트 내용 (원문 그대로)",
      "duration_estimate": "5초"
    }
  ]
}

원고:
${scriptText}`;
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
    });
    
    return parsed;
  } catch (error) {
    console.error('JSON 파싱 실패:', error.message);
    console.error('Response text:', responseText.substring(0, 500));
    throw new Error(`JSON 파싱 실패: ${error.message}`);
  }
}