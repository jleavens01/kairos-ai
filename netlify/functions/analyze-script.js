import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    if (event.httpMethod === 'POST') {
      const { projectId, scriptText } = JSON.parse(event.body);
      
      if (!projectId || !scriptText) {
        throw new Error('projectId and scriptText are required');
      }

      // 작업 ID 생성
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const jobId = `script_analysis_${timestamp}_${randomStr}`;

      // 작업 상태 초기화 (progress 컬럼 제거)
      const { error: insertError } = await supabase
        .from('script_analysis_jobs')
        .insert({
          job_id: jobId,
          user_id: null, // 실제로는 사용자 ID를 가져와야 함
          project_id: projectId,
          status: 'processing',
          raw_script: scriptText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to create job:', insertError);
        throw insertError;
      }

      // 백그라운드에서 비동기 처리 시작 - await 추가하여 완료까지 대기
      // Netlify Functions는 최대 10초까지만 실행 가능하므로 간단한 분석만 동기적으로 처리
      // 복잡한 분석은 별도 처리 필요
      setTimeout(async () => {
        await processAnalysisInBackground(jobId, projectId, scriptText, supabase);
      }, 100);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          job_id: jobId,
          message: 'Analysis started successfully'
        })
      };
    } 
    else if (event.httpMethod === 'GET') {
      const jobId = event.queryStringParameters?.job_id;
      
      if (!jobId) {
        throw new Error('job_id is required');
      }

      const { data: job, error } = await supabase
        .from('script_analysis_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error || !job) {
        throw new Error('Job not found');
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(job)
      };
    }
  } catch (error) {
    console.error('Error in analyze-script:', error);
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

// 백그라운드 처리 함수
async function processAnalysisInBackground(jobId, projectId, scriptText, supabase) {
  console.log(`[analyze-script] Starting background processing for job ${jobId}`);
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 30000,  // 대용량 스크립트 지원
      }
    });

    // AI 프롬프트 생성
    const prompt = generateAnalysisPrompt(scriptText);
    
    console.log(`Job ${jobId} - Starting AI analysis with ${scriptText.length} characters...`);
    
    // 상태 업데이트 - AI 분석 중
    await supabase
      .from('script_analysis_jobs')
      .update({
        status: 'ai_processing',
        status_message: 'AI가 스크립트를 분석 중입니다...',
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId);
    
    // AI 분석 실행
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log(`Job ${jobId} - AI response length:`, responseText.length);
    
    // JSON 파싱
    const analysisResult = parseAIResponse(responseText, jobId);
    
    // 캐릭터 분석 (2회 이상 등장하는 캐릭터 추출)
    const characterAnalysis = analyzeCharacters(analysisResult.scenes);
    
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
      backgrounds: [],  // 빈 배열로 설정
      props: [],  // 빈 배열로 설정
      director_guide: '',  // 빈 문자열로 설정
      image_prompt: null,
      video_prompt: null
    }));

    // 작업 상태 업데이트 - 데이터베이스 저장 중
    await supabase
      .from('script_analysis_jobs')
      .update({
        status: 'saving_to_db',
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId);

    // 씬 데이터 저장
    const { error: scenesError } = await supabase
      .from('production_sheets')
      .insert(scenesToInsert);

    if (scenesError) {
      throw scenesError;
    }

    // 작업 완료 처리 (progress 컬럼 제거)
    await supabase
      .from('script_analysis_jobs')
      .update({
        status: 'completed',
        result: {
          scenes: analysisResult.scenes,
          totalScenes: analysisResult.scenes.length,
          mainCharacters: characterAnalysis.mainCharacters,
          allCharacters: characterAnalysis.allCharacters,
          analysisDetails: analysisResult.analysisDetails || {}
        },
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId);

    console.log(`Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    // 작업 실패 처리
    await supabase
      .from('script_analysis_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId);
  }
}

// AI 프롬프트 생성 함수
function generateAnalysisPrompt(scriptText) {
  return `스크립트를 분석하여 씬으로 나누고 캐릭터를 추출하세요.

규칙:
1. **매우 중요**: 원고의 모든 문장을 반드시 포함시켜야 함. 단 한 문장도 빠뜨리지 말 것
2. **씬 분할 원칙**:
   - 각 씬은 5-10초 분량 (1-2문장이 적당)
   - 의미적으로 완성된 단위로 분할
   - 한 문장 내에서는 특별한 이유가 없으면 나누지 말 것
   - 문장이 길더라도 의미적으로 연결되어 있으면 한 씬으로 유지
   - 관련된 내용은 하나의 씬으로 묶어서 처리
3. 2회 이상 등장하는 인물만 캐릭터로 추출
4. **중요: "내레이터"는 캐릭터로 포함하지 말 것** - 내레이터는 화면에 등장하지 않는 음성이므로 캐릭터 목록에서 제외
5. 모든 문장 포함, 누락 금지
6. **일관성을 위한 참조 시스템**:
   - 먼저 전체 스토리에 등장하는 모든 캐릭터/배경/소품을 "scenes"의 "characters" 배열에 정의
   - 각 씬에서는 반드시 "scenes"의 "characters" 배열에 정의된 이름만 사용
   - 동일한 캐릭터/배경/소품은 모든 씬에서 동일한 이름과 설명 사용
   - **중요**: 각 씬의 characters는 해당 씬의 스크립트 내용에 실제로 필요한 것만 선택
   - 씬과 관련 없는 캐릭터를 포함시키지 말 것
7. **캐릭터 통합 규칙**:
   - "방문객", "방문객(남성)", "현재의 방문객" 같은 경우 → "방문객(남성)" 하나로 통일
   - "주인공", "화자", "나" 같은 경우 → "주인공" 하나로 통일
   - 동일 인물의 변형된 표현은 모두 하나의 캐릭터로 통합
   - characters의 경우 원고 내용을 전체를 파악해서 같은 인물이 나뉘어 지지 않도록 주의하여, 어느시기의 어느국가, 몇살의 어떤 성별의 인물인지 단수로 설정하여 "name(info)" 형태로 간결하게 표현.

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
  // 모든 캐릭터 수집
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
  
  // 2회 이상 등장하는 캐릭터 필터링
  const mainCharacters = [];
  const allCharacters = [];
  
  characterMap.forEach((count, character) => {
    allCharacters.push({ name: character, count });
    if (count >= 2) {
      mainCharacters.push({ name: character, count });
    }
  });
  
  // 등장 횟수로 정렬
  mainCharacters.sort((a, b) => b.count - a.count);
  allCharacters.sort((a, b) => b.count - a.count);
  
  return {
    mainCharacters,
    allCharacters
  };
}

// AI 응답 파싱 함수
function parseAIResponse(responseText, jobId) {
  // JSON 추출 및 정제
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
  
  // JSON 객체 추출 (중첩된 구조 고려)
  const findCompleteJSON = (text) => {
    const startIdx = text.indexOf('{');
    if (startIdx === -1) return null;
    
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return text.substring(startIdx, i + 1);
          }
        }
      }
    }
    
    return null;
  };
  
  const completeJSON = findCompleteJSON(jsonString);
  
  if (!completeJSON) {
    console.log(`Job ${jobId} - JSON 추출 실패. 응답 길이:`, responseText.length);
    console.log(`Job ${jobId} - 응답 시작 부분:`, responseText.substring(0, 500));
    console.log(`Job ${jobId} - 응답 끝 부분:`, responseText.substring(0, 500));
    throw new Error('완전한 JSON 객체를 찾을 수 없습니다. 스크립트가 너무 길어 응답이 잘렸을 수 있습니다.');
  }
  
  try {
    const parsed = JSON.parse(completeJSON);
    
    // 필수 필드 검증
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error('scenes 배열이 없습니다');
    }
    
    // 각 씬 검증
    parsed.scenes.forEach((scene, index) => {
      if (!scene.scene_number) scene.scene_number = index + 1;
      if (!scene.original_script_text) {
        throw new Error(`씬 ${scene.scene_number}에 스크립트가 없습니다`);
      }
      if (!scene.characters) scene.characters = [];
    });
    
    return parsed;
  } catch (error) {
    console.error(`Job ${jobId} - JSON 파싱 실패:`, error.message);
    console.log(`Job ${jobId} - 파싱 시도한 JSON:`, completeJSON.substring(0, 1000));
    throw new Error(`JSON 파싱 실패: ${error.message}`);
  }
}