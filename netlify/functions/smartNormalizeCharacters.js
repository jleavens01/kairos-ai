// AI 기반 스마트 캐릭터 정규화
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
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
    const { projectId } = JSON.parse(event.body);
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '프로젝트 ID가 필요합니다' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 프로젝트의 모든 시트 가져오기
    const { data: sheets, error: fetchError } = await supabase
      .from('production_sheets')
      .select('id, scene_number, characters, original_script_text')
      .eq('project_id', projectId)
      .order('scene_number');

    if (fetchError) throw fetchError;

    // 모든 고유 캐릭터 수집
    const allCharacters = new Set();
    const characterByScene = {};
    
    sheets.forEach(sheet => {
      if (sheet.characters && Array.isArray(sheet.characters)) {
        sheet.characters.forEach(char => allCharacters.add(char));
        characterByScene[sheet.scene_number] = sheet.characters;
      }
    });

    // Gemini API로 캐릭터 정규화
    const GEMINI_API_KEY = process.env.GENERATIVE_LANGUAGE_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('GENERATIVE_LANGUAGE_API_KEY 환경 변수가 설정되지 않았습니다');
      throw new Error('Gemini API 키가 설정되지 않았습니다');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
다음은 스토리의 여러 씬에서 추출된 캐릭터 이름들입니다. 
같은 캐릭터가 다양한 방식으로 표현되어 있을 수 있습니다.

캐릭터 목록:
${Array.from(allCharacters).join('\n')}

각 씬별 캐릭터:
${Object.entries(characterByScene).map(([scene, chars]) => 
  `씬 ${scene}: ${chars.join(', ')}`
).join('\n')}

다음 작업을 수행해주세요:
1. 동일한 캐릭터의 다양한 표현을 식별하고 그룹화
2. 각 캐릭터의 대표 이름 결정 (가장 간단하고 명확한 형태)
3. 모든 변형을 대표 이름으로 매핑

응답 형식 (JSON):
{
  "mainCharacters": ["루미", "아카자", ...],
  "normalizationMap": {
    "루미(빛의 힘을 사용하는 전사)": "루미",
    "루미(K-POP 안무가)": "루미",
    "루미(전사)": "루미",
    "아카자(파괴적인 힘을 사용하는 전사)": "아카자",
    "아카자(귀살대의 상현의 삼)": "아카자",
    ...
  },
  "characterDescriptions": {
    "루미": "빛의 힘을 사용하는 K-POP 안무가 전사",
    "아카자": "파괴살을 사용하는 귀살대 상현의 삼",
    ...
  }
}

중요:
- 괄호 안의 설명은 제거하고 기본 이름만 사용
- 동일 인물의 다양한 표현을 하나로 통합
- 설명이 필요한 경우 characterDescriptions에 별도 기록
`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error('Gemini API 호출 실패');
    }

    const data = await response.json();
    
    console.log('Gemini API Response:', JSON.stringify(data, null, 2));
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini API 응답 형식 오류:', data);
      throw new Error('Gemini API 응답 형식 오류');
    }

    let aiResult;
    try {
      const responseText = data.candidates[0].content.parts[0].text;
      console.log('Parsing response text:', responseText);
      aiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('Response text:', data.candidates[0].content.parts[0].text);
      throw new Error(`Gemini 응답 파싱 실패: ${parseError.message}`);
    }
    
    // 각 시트의 캐릭터 정규화 및 업데이트
    const updatePromises = sheets.map(async sheet => {
      if (sheet.characters && Array.isArray(sheet.characters)) {
        const normalizedCharacters = [];
        const seenCharacters = new Set();
        
        sheet.characters.forEach(char => {
          const normalizedName = aiResult.normalizationMap[char] || char;
          
          // 중복 제거
          if (!seenCharacters.has(normalizedName)) {
            normalizedCharacters.push(normalizedName);
            seenCharacters.add(normalizedName);
          }
        });
        
        // DB 업데이트
        const { error: updateError } = await supabase
          .from('production_sheets')
          .update({ 
            characters: normalizedCharacters,
            metadata: {
              ...sheet.metadata,
              original_characters: sheet.characters,
              normalized_at: new Date().toISOString(),
              normalization_method: 'ai-smart'
            }
          })
          .eq('id', sheet.id);

        if (updateError) {
          console.error('Sheet update error:', updateError);
        }

        return { id: sheet.id, normalized: normalizedCharacters };
      }
    });

    const results = await Promise.all(updatePromises.filter(Boolean));

    // 프로젝트 메타데이터에 캐릭터 정보 저장
    const { error: projectUpdateError } = await supabase
      .from('projects')
      .update({
        metadata: {
          main_characters: aiResult.mainCharacters,
          character_descriptions: aiResult.characterDescriptions,
          character_normalization_map: aiResult.normalizationMap,
          normalized_at: new Date().toISOString(),
          normalization_method: 'ai-smart'
        }
      })
      .eq('id', projectId);

    if (projectUpdateError) {
      console.error('Project update error:', projectUpdateError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          mainCharacters: aiResult.mainCharacters,
          characterDescriptions: aiResult.characterDescriptions,
          normalizationMap: aiResult.normalizationMap,
          sheetsUpdated: results.length,
          message: `${results.length}개 씬의 캐릭터를 AI로 정규화했습니다`
        }
      })
    };

  } catch (error) {
    console.error('Smart normalization error:', error);
    console.error('Error stack:', error.stack);
    
    // 상세한 에러 메시지 반환
    let errorMessage = '스마트 캐릭터 정규화 중 오류가 발생했습니다';
    let errorDetails = error.message;
    
    if (error.message && error.message.includes('API 키')) {
      errorMessage = 'Gemini API 키가 설정되지 않았습니다';
      errorDetails = 'Netlify 환경 변수에 GENERATIVE_LANGUAGE_API_KEY를 설정해주세요';
    } else if (error.message && error.message.includes('파싱')) {
      errorMessage = 'AI 응답 파싱 실패';
      errorDetails = 'Gemini API가 올바른 JSON 형식을 반환하지 않았습니다';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: errorDetails
      })
    };
  }
};