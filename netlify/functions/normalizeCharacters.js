// 캐릭터 이름 정규화 함수
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
      .select('id, scene_number, characters')
      .eq('project_id', projectId)
      .order('scene_number');

    if (fetchError) throw fetchError;

    // 모든 캐릭터 수집 및 분석
    const characterMap = new Map();
    const characterVariations = new Map();

    sheets.forEach(sheet => {
      if (sheet.characters && Array.isArray(sheet.characters)) {
        sheet.characters.forEach(char => {
          // 기본 이름 추출 (괄호 안 내용 제거)
          const baseName = extractBaseName(char);
          
          if (!characterMap.has(baseName)) {
            characterMap.set(baseName, {
              mainName: baseName,
              variations: new Set(),
              scenes: []
            });
          }
          
          const charData = characterMap.get(baseName);
          charData.variations.add(char);
          charData.scenes.push(sheet.scene_number);
        });
      }
    });

    // 캐릭터 정규화 규칙 생성
    const normalizationRules = {};
    
    characterMap.forEach((data, baseName) => {
      // 가장 짧은 형태를 기본 이름으로 사용
      let mainName = baseName;
      
      // 변형 중 가장 자주 나타나는 것을 메인으로
      const variationCounts = {};
      data.variations.forEach(v => {
        variationCounts[v] = (variationCounts[v] || 0) + 1;
      });
      
      const mostFrequent = Object.entries(variationCounts)
        .sort((a, b) => b[1] - a[1])[0][0];
      
      // 모든 변형을 메인 이름으로 매핑
      data.variations.forEach(variation => {
        normalizationRules[variation] = baseName;
      });
    });

    // 각 시트의 캐릭터 정규화
    const updatePromises = sheets.map(async sheet => {
      if (sheet.characters && Array.isArray(sheet.characters)) {
        const normalizedCharacters = [];
        const seenCharacters = new Set();
        
        sheet.characters.forEach(char => {
          const normalizedName = normalizationRules[char] || extractBaseName(char);
          
          // 중복 제거
          if (!seenCharacters.has(normalizedName)) {
            normalizedCharacters.push(normalizedName);
            seenCharacters.add(normalizedName);
          }
        });
        
        // DB 업데이트
        return supabase
          .from('production_sheets')
          .update({ 
            characters: normalizedCharacters,
            metadata: {
              ...sheet.metadata,
              original_characters: sheet.characters,
              normalized_at: new Date().toISOString()
            }
          })
          .eq('id', sheet.id);
      }
    });

    await Promise.all(updatePromises.filter(Boolean));

    // 프로젝트 전체 캐릭터 목록 생성
    const mainCharacters = Array.from(characterMap.keys()).sort();
    
    // 프로젝트 메타데이터에 캐릭터 목록 저장
    const { error: projectUpdateError } = await supabase
      .from('projects')
      .update({
        metadata: {
          main_characters: mainCharacters,
          character_normalization_rules: normalizationRules,
          normalized_at: new Date().toISOString()
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
          mainCharacters,
          normalizationRules,
          totalSheets: sheets.length,
          message: `${sheets.length}개 씬의 캐릭터를 정규화했습니다`
        }
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || '캐릭터 정규화 중 오류가 발생했습니다'
      })
    };
  }
};

// 기본 이름 추출 함수
function extractBaseName(characterName) {
  // 괄호와 그 안의 내용 제거
  let baseName = characterName.replace(/\([^)]*\)/g, '').trim();
  
  // 특수한 경우 처리
  if (baseName.includes('(')) {
    baseName = baseName.split('(')[0].trim();
  }
  
  // 공백 정리
  baseName = baseName.replace(/\s+/g, ' ').trim();
  
  return baseName;
}