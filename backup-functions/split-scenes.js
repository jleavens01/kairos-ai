// 씬 분할 전용 함수 (캐릭터 추출 없이 단순화)
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
    console.log(`Script length: ${scriptText.length} characters`);
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log('AI response received');
    console.log(`Response length: ${responseText.length} characters`);
    console.log('Starting JSON parsing...');
    
    // JSON 파싱 (원본 스크립트도 함께 전달)
    const splitResult = parseAIResponse(responseText, scriptText);
    
    // 기존 production_sheets 조회
    const { data: existingSheets } = await supabase
      .from('production_sheets')
      .select('scene_number')
      .eq('project_id', projectId);
    
    const maxSceneNumber = existingSheets?.length > 0 
      ? Math.max(...existingSheets.map(item => item.scene_number || 0)) 
      : 0;
    
    // production_sheets 테이블에 저장 (단순화된 구조)
    const scenesToInsert = splitResult.scenes.map((scene, index) => ({
      project_id: projectId,
      scene_number: maxSceneNumber + 1 + index,
      original_script_text: scene.text || scene.original_script_text || '',
      characters: scene.characters || [],
      backgrounds: [],
      props: [],
      director_guide: '',
      image_prompt: null,
      video_prompt: null,
      metadata: {
        has_dialogue: scene.characters && scene.characters.length > 0
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
    console.error('Error stack:', error.stack);
    
    // 더 자세한 오류 정보 제공
    let errorMessage = error.message;
    if (error.message.includes('JSON 파싱 실패')) {
      errorMessage += '. AI가 올바른 JSON 형식을 생성하지 못했습니다. 다시 시도해주세요.';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: error.stack 
      })
    };
  }
};

// 씬 분할 전용 프롬프트
function generateSplitPrompt(scriptText) {
  return `아래 스크립트를 씬으로 나누어주세요.

규칙:
1. 절대로 요약하지 마세요
2. 원본 텍스트를 그대로 사용하세요
3. 한 씬은 1-2문장 정도로 나누세요
4. 모든 문장을 빠짐없이 포함하세요

스크립트:
${scriptText}

원본 텍스트를 그대로 나누어 JSON으로 반환:
{
  "scenes": [
    {"text": "원본의 첫 번째 부분 그대로", "characters": []},
    {"text": "원본의 두 번째 부분 그대로", "characters": []}
  ]
}`;
}

// AI 응답 파싱 함수 (원본 스크립트 보존)
function parseAIResponse(responseText, originalScript) {
  try {
    // 마크다운 블록 제거
    let jsonString = responseText;
    if (jsonString.includes('```')) {
      const start = jsonString.indexOf('{');
      const end = jsonString.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) {
        jsonString = jsonString.substring(start, end);
      }
    }
    
    // 제어 문자 제거
    jsonString = jsonString
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/^\uFEFF/, '');
    
    // JSON 파싱
    const parsed = JSON.parse(jsonString);
    
    // 기본 검증
    if (!parsed.scenes) {
      throw new Error('scenes 배열이 없습니다');
    }
    
    // 배열이 아니면 배열로 변환
    if (!Array.isArray(parsed.scenes)) {
      parsed.scenes = [parsed.scenes];
    }
    
    // AI가 요약했는지 체크
    let totalParsedLength = 0;
    parsed.scenes.forEach(scene => {
      const text = scene.text || scene.original_script_text || '';
      totalParsedLength += text.length;
    });
    
    // AI가 요약했다면 (원본의 70% 미만이면 요약한 것으로 판단)
    if (totalParsedLength < originalScript.length * 0.7) {
      console.warn('AI가 텍스트를 요약했습니다. 원본 스크립트로 직접 분할합니다.');
      throw new Error('AI summarized the text');
    }
    
    // 각 씬 검증
    parsed.scenes = parsed.scenes.map((scene, index) => {
      // text 필드 확인
      if (!scene.text && !scene.original_script_text) {
        console.warn(`씬 ${index + 1}에 텍스트가 없습니다`);
        scene.text = '';
      }
      
      // characters 필드 확인
      if (!scene.characters) {
        scene.characters = [];
      }
      
      return scene;
    });
    
    return parsed;
    
  } catch (error) {
    console.error('AI 파싱 실패, 원본 스크립트 직접 분할:', error.message);
    
    // 원본 스크립트를 직접 분할
    try {
      // 줄바꿈을 기본 단위로 처리
      const lines = originalScript.split('\n').filter(line => line.trim());
      const tempScenes = [];
      
      // 먼저 줄별로 분석
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // "캐릭터명 |" 패턴 체크
        const characterMatch = line.match(/^([가-힣A-Za-z0-9\s]+)\s*\|(.*)$/);
        
        if (characterMatch) {
          // 캐릭터 대화는 한 씬으로
          tempScenes.push({
            text: line,
            characters: [characterMatch[1].trim()],
            type: 'dialogue'
          });
        } else {
          // 내레이션이나 일반 텍스트
          tempScenes.push({
            text: line,
            characters: [],
            type: 'narration'
          });
        }
      }
      
      // 너무 짧은 씬들을 합치기 (50자 미만인 경우)
      const scenes = [];
      let currentScene = null;
      
      for (let i = 0; i < tempScenes.length; i++) {
        const scene = tempScenes[i];
        
        // 대화는 무조건 독립 씬
        if (scene.type === 'dialogue') {
          if (currentScene) {
            scenes.push(currentScene);
            currentScene = null;
          }
          scenes.push({
            text: scene.text,
            characters: scene.characters
          });
        } else {
          // 내레이션은 짧으면 합치기
          if (!currentScene) {
            currentScene = {
              text: scene.text,
              characters: []
            };
          } else if (currentScene.text.length < 50) {
            // 50자 미만이면 다음 내레이션과 합치기
            currentScene.text += '\n' + scene.text;
          } else {
            // 충분히 길면 저장하고 새로 시작
            scenes.push(currentScene);
            currentScene = {
              text: scene.text,
              characters: []
            };
          }
        }
      }
      
      // 마지막 씬 추가
      if (currentScene) {
        scenes.push(currentScene);
      }
      
      if (scenes.length > 0) {
        console.log(`줄바꿈 기반으로 ${scenes.length}개의 씬 생성`);
        return { scenes };
      }
      
      // 줄바꿈 기반 분할이 실패하면 문장 단위로 분할
      const sentences = originalScript.match(/[^.!?]+[.!?]+/g) || [originalScript];
      const fallbackScenes = [];
      
      // 1-2 문장씩 묶어서 씬으로 만들기
      for (let i = 0; i < sentences.length; i++) {
        const text = sentences[i].trim();
        if (text) {
          // 문장이 너무 길면 (100자 이상) 그 자체로 하나의 씬
          // 짧으면 다음 문장과 합치기
          if (text.length > 100 || i === sentences.length - 1) {
            fallbackScenes.push({
              text: text,
              characters: extractCharacters(text)
            });
          } else if (i + 1 < sentences.length) {
            // 다음 문장과 합쳐서 씬 생성
            const combinedText = text + ' ' + sentences[i + 1].trim();
            fallbackScenes.push({
              text: combinedText,
              characters: extractCharacters(combinedText)
            });
            i++; // 다음 문장 스킵
          }
        }
      }
      
      if (fallbackScenes.length > 0) {
        console.log(`문장 기반으로 ${fallbackScenes.length}개의 씬 생성`);
        return { scenes: fallbackScenes };
      }
      
    } catch (fallbackError) {
      console.error('원본 분할도 실패:', fallbackError);
    }
    
    // 최후의 수단: 전체 텍스트를 하나의 씬으로
    return {
      scenes: [{
        text: originalScript,
        characters: extractCharacters(originalScript)
      }]
    };
  }
}

// 간단한 캐릭터 추출 함수
function extractCharacters(text) {
  const characters = [];
  
  // "캐릭터명 |" 패턴 찾기
  const matches = text.match(/([가-힣A-Za-z0-9\s]+)\s*\|/g);
  if (matches) {
    matches.forEach(match => {
      const name = match.replace('|', '').trim();
      if (name && !characters.includes(name)) {
        characters.push(name);
      }
    });
  }
  
  return characters;
}