// 선택된 씬들의 캐릭터 추출 함수
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
    const { 
      sceneIds,        // 캐릭터 추출할 씬 ID 배열
      projectId,
      existingCharacters = []  // 프로젝트에 이미 있는 캐릭터 리스트
    } = JSON.parse(event.body);
    
    if (!sceneIds || !projectId || sceneIds.length === 0) {
      throw new Error('Scene IDs and project ID are required');
    }

    console.log(`Extracting characters for ${sceneIds.length} scenes in project ${projectId}`);
    console.log(`Existing characters: ${existingCharacters.length}`);

    // 선택된 씬들 조회
    const { data: scenes, error: fetchError } = await supabase
      .from('production_sheets')
      .select('*')
      .eq('project_id', projectId)
      .in('id', sceneIds);

    if (fetchError) throw fetchError;
    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes found');
    }

    // Gemini AI 초기화
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 4096,
      }
    });

    // 각 씬의 캐릭터 추출
    const updatedScenes = [];
    
    for (const scene of scenes) {
      const prompt = generateCharacterPrompt(
        scene.original_script_text, 
        existingCharacters
      );
      
      console.log(`Extracting characters for scene ${scene.scene_number}...`);
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      console.log(`AI Response for scene ${scene.scene_number}:`, responseText);
      
      const characterData = parseCharacterResponse(responseText);
      
      console.log(`Parsed characters for scene ${scene.scene_number}:`, characterData.characters);
      
      // 씬 업데이트 - characters는 문자열 배열로 저장
      const charactersToSave = Array.isArray(characterData.characters) 
        ? characterData.characters 
        : [];
      
      console.log(`Saving characters for scene ${scene.id}:`, charactersToSave);
      
      // production_sheets 테이블에는 metadata 컬럼이 없으므로 characters만 업데이트
      const { data: updatedScene, error: updateError } = await supabase
        .from('production_sheets')
        .update({
          characters: charactersToSave  // ["홍길동(조선시대 의적)", "김철수(회사원)"] 형태로 저장
        })
        .eq('id', scene.id)
        .select()
        .single();

      if (updateError) {
        console.error(`Failed to update scene ${scene.id}:`, updateError);
      } else {
        updatedScenes.push(updatedScene);
      }
    }

    // 전체 프로젝트의 캐릭터 리스트 업데이트
    const allCharacters = extractUniqueCharacters(updatedScenes, existingCharacters);
    
    // 프로젝트 메타데이터 업데이트는 선택적 (production_sheets에서 직접 가져오므로)
    // 나중에 필요하면 활성화 가능
    /*
    const { data: projectData, error: projectFetchError } = await supabase
      .from('projects')
      .select('metadata')
      .eq('id', projectId)
      .single();
    
    if (!projectFetchError && projectData) {
      await supabase
        .from('projects')
        .update({
          metadata: {
            ...(projectData.metadata || {}),
            characters: allCharacters,
            last_character_extraction: new Date().toISOString()
          }
        })
        .eq('id', projectId);
    }
    */

    console.log(`Successfully extracted characters for ${updatedScenes.length} scenes`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: `${updatedScenes.length}개 씬의 캐릭터 추출 완료`,
        data: {
          updatedScenes,
          allCharacters
        }
      })
    };

  } catch (error) {
    console.error('Error in extract-characters:', error);
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

// 캐릭터 추출 프롬프트 생성
function generateCharacterPrompt(scriptText, existingCharacters) {
  const characterList = existingCharacters.length > 0 
    ? `\n기존 캐릭터 리스트:\n${existingCharacters.map(c => typeof c === 'string' ? `- ${c}` : `- ${c.name}`).join('\n')}\n` 
    : '';

  return `다음 스크립트에서 등장하는 캐릭터를 추출해주세요.

${characterList}

⚠️ 매우 중요한 규칙:
1. 동일한 캐릭터는 절대 중복 생성하지 마세요
   - 예: "루미(전사)"와 "루미(K-POP 안무가)"는 같은 인물이면 하나로 통합
   - 예: "할머니"와 "할머니(70대)"는 하나로 통합
2. 캐릭터 판단 기준:
   - 이름이 같으면 = 같은 인물
   - 역할이 달라도 이름이 같으면 = 같은 인물  
   - 다른 씬에서 다른 모습이어도 = 같은 인물
3. 캐릭터 표기는 가장 대표적인 특징 하나만 사용
   - 좋은 예: "루미(전사)", "할머니(70대)"
   - 나쁜 예: "루미(전사/K-POP 안무가)", "할머니"를 여러 개로 분리
4. 스크립트 상 스토리 전개에 필요한 주요 캐릭터만 추출
5. "내레이터"는 제외
6. 기존 캐릭터 리스트에 있는 인물이면 정확히 동일한 이름 사용

반드시 아래와 같은 간단한 JSON 형식으로만 응답하세요:
{
  "characters": ["홍길동(조선시대 의적)", "김철수(회사원)", "이영희(학생)"]
}

캐릭터가 없으면:
{
  "characters": []
}

스크립트:
${scriptText}`;
}

// 캐릭터 응답 파싱
function parseCharacterResponse(responseText) {
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
    console.log('Attempting to parse JSON:', jsonString.substring(0, 300));
    const parsed = JSON.parse(jsonString);
    
    // 캐릭터 배열이 없으면 빈 배열 반환
    if (!parsed.characters) {
      console.log('No characters field found in response');
      return { characters: [] };
    }
    
    // 배열이 아니면 빈 배열 반환
    if (!Array.isArray(parsed.characters)) {
      console.log('Characters field is not an array');
      return { characters: [] };
    }
    
    // 문자열 배열로 변환 (내레이터 제외)
    const characterNames = parsed.characters
      .filter(char => typeof char === 'string' && char !== '내레이터')
      .filter((char, index, self) => self.indexOf(char) === index); // 중복 제거
    
    console.log('Extracted character names:', characterNames);
    
    return {
      characters: characterNames  // ["홍길동(조선시대 의적)", "김철수(회사원)"] 형태
    };
  } catch (error) {
    console.error('Character JSON parsing failed:', error.message);
    console.error('Raw response:', responseText.substring(0, 500));
    
    // 백업: 간단한 패턴 매칭 시도
    try {
      const match = responseText.match(/"characters"\s*:\s*\[(.*?)\]/s);
      if (match) {
        const charactersStr = match[1];
        const characters = charactersStr
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(s => s && s !== '내레이터');
        
        console.log('Fallback extraction:', characters);
        return { characters };
      }
    } catch (e) {
      console.error('Fallback extraction failed:', e);
    }
    
    return { characters: [] };
  }
}

// 전체 캐릭터 리스트 추출
function extractUniqueCharacters(scenes, existingCharacters) {
  const characterMap = new Map();
  
  // 기존 캐릭터 추가
  existingCharacters.forEach(char => {
    const name = typeof char === 'string' ? char : char.name;
    characterMap.set(name, {
      name,
      count: 0,
      scenes: []
    });
  });
  
  // 씬별 캐릭터 집계
  scenes.forEach(scene => {
    if (scene.characters && Array.isArray(scene.characters)) {
      scene.characters.forEach(character => {
        if (character && character !== '내레이터') {
          if (!characterMap.has(character)) {
            characterMap.set(character, {
              name: character,
              count: 0,
              scenes: []
            });
          }
          const charData = characterMap.get(character);
          charData.count++;
          charData.scenes.push(scene.scene_number);
        }
      });
    }
  });
  
  // 배열로 변환하고 정렬
  const allCharacters = Array.from(characterMap.values())
    .sort((a, b) => b.count - a.count);
  
  return allCharacters;
}