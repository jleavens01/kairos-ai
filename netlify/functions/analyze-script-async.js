// 비동기 스크립트 분석 함수 - 즉시 응답 후 백그라운드 처리
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { projectId, scriptText, analysisType = 'documentary', contentType = '다큐멘터리' } = JSON.parse(event.body);
    
    if (!projectId || !scriptText) {
      throw new Error('projectId and scriptText are required');
    }

    // 사용자 인증 확인 (Authorization 헤더에서 JWT 토큰 추출)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header is required');
    }

    // 토큰 추출 및 사용자 정보 가져오기 (다른 함수들과 동일한 패턴)
    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Invalid authentication token');
    }

    // RLS를 위해 세션 설정
    await supabase.auth.setSession({ access_token: token, refresh_token: null });

    console.log(`Starting async analysis for project ${projectId}, script length: ${scriptText.length}`);

    // 1. Service Role 클라이언트로 작업 생성 (RLS 우회)
    const serviceSupabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // 분석 작업 생성 및 즉시 ID 반환
    const { data: job, error: jobError } = await serviceSupabase
      .from('script_analysis_jobs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        script_text: scriptText,
        script_length: scriptText.length,
        analysis_type: analysisType,
        job_status: 'pending',
        current_step: '분석 작업 준비 중...',
        estimated_completion_time: new Date(Date.now() + getEstimatedTime(scriptText.length))
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    console.log(`Created analysis job ${job.id}`);

    processAnalysisInBackground(job.id, serviceSupabase)
      .catch(error => {
        console.error(`Background analysis failed for job ${job.id}:`, error);
        // 실패 상태로 업데이트
        updateJobStatus(job.id, 'failed', error.message, serviceSupabase);
      });

    // 3. 즉시 작업 ID와 상태 확인 URL 반환
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        success: true,
        jobId: job.id,
        status: 'pending',
        message: '분석 작업이 시작되었습니다. 잠시 후 결과를 확인해주세요.',
        estimatedCompletionTime: job.estimated_completion_time,
        checkStatusUrl: `/.netlify/functions/check-analysis-status?jobId=${job.id}`
      })
    };

  } catch (error) {
    console.error('Error in analyze-script-async:', error);
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

// 예상 소요 시간 계산 (문자 수 기반)
function getEstimatedTime(scriptLength) {
  // 대략 1000자당 20-30초 예상
  const timePerThousandChars = 25000; // 25초
  const baseTime = 30000; // 기본 30초
  return baseTime + (scriptLength / 1000) * timePerThousandChars;
}

// 백그라운드 분석 처리 함수
async function processAnalysisInBackground(jobId, supabase) {
  try {
    console.log(`Starting background analysis for job ${jobId}`);
    
    // 작업 정보를 먼저 가져와서 user_id 확인
    const { data: jobInfo, error: jobInfoError } = await supabase
      .from('script_analysis_jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (jobInfoError || !jobInfo) {
      throw new Error('Job not found');
    }

    // Service role로 작업하므로 user_id는 나중에 활용

    // 작업 상태를 'processing'으로 업데이트
    await updateJobStatus(jobId, 'processing', null, supabase, {
      progress_percentage: 10,
      current_step: 'AI 모델 준비 중...',
      started_at: new Date().toISOString()
    });

    // 작업 정보 가져오기
    const { data: job, error: jobError } = await supabase
      .from('script_analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Analysis job not found');
    }

    // AI 모델 설정 - Gemini 2.5 Pro로 변경 (더 안정적)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",  // 2.5 Pro로 변경
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 65536  // 2.5 Pro의 최대 출력 토큰
      }
    });

    await updateJobStatus(jobId, 'processing', null, supabase, {
      progress_percentage: 30,
      current_step: 'AI 분석 실행 중...'
    });

    // AI 프롬프트 생성 및 분석 실행 (콘텐츠 타입 포함)
    const prompt = generateAnalysisPrompt(job.script_text, '다큐멘터리');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log(`AI response length: ${responseText.length}`);
    console.log(`AI response preview (first 500 chars): ${responseText.substring(0, 500)}`);
    console.log(`AI response preview (last 500 chars): ${responseText.substring(Math.max(0, responseText.length - 500))}`)

    await updateJobStatus(jobId, 'processing', null, supabase, {
      progress_percentage: 70,
      current_step: '분석 결과 처리 중...'
    });

    // 1단계: 원본 응답 저장 및 기본 파싱 시도
    let analysisResult = null;
    let partialScenes = [];
    let parsing_status = 'failed';
    
    try {
      analysisResult = parseAIResponse(responseText);
      partialScenes = analysisResult.scenes || [];
      parsing_status = 'success';
      console.log(`JSON parsing successful: ${partialScenes.length} scenes extracted`);
    } catch (parseError) {
      console.log(`JSON parsing failed, attempting partial extraction: ${parseError.message}`);
      // 부분 파싱 시도
      partialScenes = attemptPartialParsing(responseText);
      parsing_status = partialScenes.length > 0 ? 'partial' : 'failed';
      console.log(`Partial parsing result: ${partialScenes.length} scenes extracted`);
    }

    // 원본 응답과 파싱 상태를 job에 저장
    await updateJobStatus(jobId, 'processing', null, supabase, {
      progress_percentage: 70,
      current_step: `원본 저장 완료 (${partialScenes.length}개 씬)`,
      raw_ai_response: responseText,
      parsing_status: parsing_status
    });

    if (partialScenes.length > 0) {
      await updateJobStatus(jobId, 'processing', null, supabase, {
        progress_percentage: 85,
        current_step: '데이터베이스 저장 중...'
      });

      // production_sheets에 부분 결과라도 저장 (호환성 래퍼)
      const legacyFormat = { scenes: partialScenes, sequences: [] };
      await saveScenesToDatabase(job.project_id, legacyFormat, supabase);

      // 캐릭터 분석
      const characterAnalysis = analyzeCharacters(partialScenes);

      // 작업 상태 결정
      const finalStatus = parsing_status === 'success' ? 'completed' : 'needs_cleanup';
      const finalStep = parsing_status === 'success' ? '분석 완료' : '정리 작업 필요';

      // 작업 완료/부분완료 상태로 업데이트
      await updateJobStatus(jobId, finalStatus, null, supabase, {
        progress_percentage: parsing_status === 'success' ? 100 : 90,
        current_step: finalStep,
        completed_at: parsing_status === 'success' ? new Date().toISOString() : null,
        total_scenes: partialScenes.length,
        result_data: {
          scenes: partialScenes,
          totalScenes: partialScenes.length,
          mainCharacters: characterAnalysis.mainCharacters,
          allCharacters: characterAnalysis.allCharacters,
          needs_cleanup: parsing_status !== 'success',
          completedAt: new Date().toISOString()
        }
      });

      console.log(`Analysis ${finalStatus} for job ${jobId}, ${partialScenes.length} scenes, parsing: ${parsing_status}`);
      
    } else {
      // 씬이 하나도 추출되지 않은 경우
      await updateJobStatus(jobId, 'failed', '씬을 추출할 수 없습니다', supabase, {
        progress_percentage: 0,
        current_step: '분석 실패',
        raw_ai_response: responseText,
        parsing_status: 'failed'
      });
      
      console.log(`Analysis failed for job ${jobId}, no scenes extracted`);
    }

  } catch (error) {
    console.error(`Background analysis error for job ${jobId}:`, error);
    await updateJobStatus(jobId, 'failed', error.message, supabase, {
      progress_percentage: 0,
      current_step: '분석 실패'
    });
    throw error;
  }
}

// 작업 상태 업데이트 함수
async function updateJobStatus(jobId, status, errorMessage, supabase, additionalData = {}) {
  const updateData = {
    job_status: status,
    ...additionalData
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await supabase
    .from('script_analysis_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    console.error(`Failed to update job status for ${jobId}:`, error);
  }
}

// production_sheets에 씬 저장 (시퀀스 정보 포함)
async function saveScenesToDatabase(projectId, analysisResult, supabase) {
  const { scenes, sequences } = analysisResult;
  
  // 기존 씬 번호 확인
  const { data: existingSheets } = await supabase
    .from('production_sheets')
    .select('scene_number')
    .eq('project_id', projectId);

  const maxSceneNumber = existingSheets?.length > 0 
    ? Math.max(...existingSheets.map(item => item.scene_number || 0)) 
    : 0;

  // 새로운 씬 데이터 준비 (시퀀스 정보 포함)
  const scenesToInsert = scenes.map((scene, index) => ({
    project_id: projectId,
    scene_number: maxSceneNumber + 1 + index,
    original_script_text: scene.original_script_text || '',
    characters: scene.characters || [],
    backgrounds: scene.backgrounds || [],
    props: scene.props || [],
    director_guide: scene.director_guide || '',
    image_prompt: null,
    video_prompt: null,
    // 시퀀스 정보 추가
    sequence_id: scene.sequence_id || 1,
    sequence_name: scene.sequence_name || 'Sequence 1',
    metadata: {
      scene_type: scene.scene_type || 'mixed',
      reference_sources: scene.reference_sources || [],
      semantic_boundary: scene.semantic_boundary || '',
      semantic_note: scene.semantic_note || '',
      sequence_order: scene.sequence_id || 1, // 메타데이터로 이동
      sequences: sequences, // 전체 시퀀스 정보 보관
      analysis_version: '3.0',
      created_by_function: 'analyze-script-async',
      ...scene.metadata
    }
  }));

  // 데이터베이스에 저장
  const { error: scenesError } = await supabase
    .from('production_sheets')
    .insert(scenesToInsert);

  if (scenesError) {
    throw scenesError;
  }

  return scenesToInsert.length;
}

// AI 프롬프트 생성 함수 (콘텐츠 성격 고려)
function generateAnalysisPrompt(scriptText, contentType = '다큐멘터리') {
  return `[역할 부여]
너는 다큐멘터리, 드라마, 영화, 애니메이션, 프리젠테이션에 다방면으로 최고의 능력을 가진 연출자야. 텍스트로 된 시나리오를 그래픽과 애니메이션 중심의 시각적 연출안으로 재구성하는 데 매우 능숙해.

[목표 제시]
제공된 ${contentType} 시나리오를 분석해서, 그래픽과 애니메이션의 비중이 매우 높은 '연출정리표'를 JSON 형식으로 제작해줘.

[콘텐츠 성격 고려사항]
${contentType} 장르의 특성을 연출 방법과 톤에 반영해야 해:
- 다큐멘터리: 객관적이고 사실적인 연출, 정보 전달 우선, 교육적 가치 강조
- 드라마: 감정적 몰입 유도, 캐릭터 중심 연출, 갈등과 긴장감 활용
- 영화: 시각적 임팩트와 영화적 기법, 스펙터클한 연출, 몰입감 극대화
- 애니메이션: 창의적이고 상상력 있는 시각화, 유연하고 자유로운 표현
- 프리젠테이션: 명확하고 논리적인 메시지 전달, 설득력 있는 구성, 이해하기 쉬운 연출

**중요**: 이는 시퀀스 구조를 강제하는 것이 아니라, 주어진 원고의 자연스러운 흐름 속에서 각 장르에 맞는 연출 방법을 적용하는 것이야.

[핵심 작업 지시]

1. 시퀀스-씬 분석 (2단계 구조 접근!):

   A. 시퀀스 분석 (자연스러운 주제/맥락 전환 기준):
   - 먼저 전체 스크립트를 자연스럽게 흘러가는 주제/맥락 단위로 시퀀스(Sequence)로 나눠줘
   - 시퀀스 분할 기준:
     * 주제나 소재의 큰 전환 (경제 → 정치, 이론 → 실제 사례 등)
     * 시간적 흐름의 변화 (과거 → 현재, 역사적 배경 → 현재 상황 등)  
     * 관점이나 접근 방식의 변화 (문제 제시 → 해결 방안, 원인 분석 → 결과 예측 등)
     * 화자나 상황의 큰 전환 (나레이션 → 인터뷰, 설명 → 사례 등)
   - 원고 내용 자체의 흐름을 따라 자연스럽게 시퀀스를 구분해
   - 각 시퀀스에는 해당 구간의 핵심 내용을 반영한 의미있는 이름을 부여해

   B. 씬 분석 (시퀀스 내 의미 단위):
   - 각 시퀀스 내에서 의미적으로 완성된 단위로 씬(Scene)을 나눠줘
   - 각 씬은 하나의 완전한 생각이나 상황을 포함하도록 구성해야 해
   - 의미적 씬 분할 기준:
     * 물리적 장소나 배경의 변화 (실내→실외, 도시→시골 등)
     * 시간적 흐름의 변화 (과거→현재, 아침→저녁 등)
     * 상황이나 맥락의 전환 (설명→예시, 문제제시→해결책 등)
     * 화자나 주체의 변경 (나레이터→인터뷰어, 인물A→인물B 등)
     * 주제나 소재의 전환 (경제→정치, 이론→실제 사례 등)
     * 감정적 톤이나 분위기의 변화 (진지함→유머, 긍정→부정 등)
     * 씬 타입의 변화 (표&그래프 → 자료 → 애니메이션 등)
   - **중요**: 씬 타입이 바뀌면 반드시 새로운 씬으로 분할해야 해 (mixed 타입은 사용 금지)
   - 나눈 대본은 'original_script_text' 필드에 원문 그대로, 일절 수정 없이 모두 포함해야 해
   - 전체 스크립트가 빠짐없이 모든 씬에 포함되어야 해
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


   2. 의미단락 기반 자동 경계 감지:
   - 문장 구조 분석: 접속사, 전환어, 시간 표현어를 통한 자연스러운 경계점 탐지
   - 내용 응집성 평가: 동일 주제/상황 내에서의 내용 일관성 유지
   - 논리적 흐름 추적: 원인-결과, 문제-해결, 일반-구체 등의 논리 구조 인식
   - 시간적/공간적 연속성: 시공간 변화 지점에서의 자연스러운 분할
   - 화자/관점 변화: 서술 주체나 시점 변화를 통한 경계 설정
   - 키워드 클러스터링: 유사한 개념/단어가 집중된 구간을 하나의 의미 단위로 인식
   - 문장 복잡도 분석: 설명이 복잡해지는 구간과 단순해지는 구간의 경계 탐지
   - 수사적 패턴 인식: 질문-답변, 예시-설명, 비교-대조 등의 수사 구조 파악

   3. 시각적 연출 제안:
   - 자료 영상의 제한적 사용: 현대에 일어난 상징적인 사건이나, 현존하는 인물/장소를 보여주어 현실감을 부여해야 할 때 가장 효과적인 방법이 자료이다. 반면 의미없는 자료는 전달력이 약하다. 그걸 잘 판단하여 제한적으로 사용.
   - 그래픽 중심: 스토리텔링 전개 방식, 추상적 개념, 복잡한 이론 설명은 자료영상 대신 애니메이션(모션그래픽)을 최우선으로 사용
   - 텍스트는 이미지 생성시 깨지는 문제가 있기 때문에 텍스트를 활용한 연출은 금지.
   - 지도를 활용한 연출은 아직 정확도가 떨어지기 때문에 연출 금지.

3. 연출가이드 작성 (시퀀스 맥락과 콘텐츠 장르 특성 고려):
   - 연출가이드는 해당 씬이 속한 시퀀스의 맥락과 ${contentType} 장르의 연출 특성을 반영해야 해
   - 시퀀스 맥락 고려:
     * 시퀀스 내에서 해당 씬의 역할과 위치
     * 이전 씬과의 연결성과 다음 씬으로의 자연스러운 전환
     * 시퀀스 전체 주제 흐름 내에서의 기능과 의미
   - ${contentType} 장르에 맞는 연출 접근법:
     * 해당 장르의 보편적 연출 방법과 톤 적용
     * 장르 특성에 맞는 시각적 표현 기법 활용
     * 관객과의 소통 방식과 몰입도 고려
   - 연출가이드에 포함할 요소:
     * 씬의 핵심 목적과 전달하고자 하는 메시지
     * 시퀀스의 자연스러운 흐름 속에서의 역할
     * ${contentType} 장르 특성에 맞는 연출 기법과 톤
     * 시각적 요소들의 효과적인 배치와 활용 방안
     * 전후 씬과의 부드럽고 논리적인 연결 방법

4. 에셋 상세 분석:
   - 캐릭터: 장면에 필요한 모든 인물 (국가, 시대, 성별, 역사적인 인물 등을 괄호 안에 간략히 표기)
   - 캐릭터 설정시 내용상 중복되는 인물이라면 일관성있게 사용. 
   - 하지만 동일 인물이라도 시대가 다르거나 역할이 다르면 별도의 캐릭터로 설정.
   - 배경: 특정 시대의 특정 장소가 필요한 경우에만 추출하기. 씬별로 배경은 하나로 제한
   - 소품/그래픽: 반드시 필요한 핵심 소품, 아이콘만 추출.

반드시 이 JSON 구조로 응답해줘:
{
  "sequences": [
    {
      "sequence_id": 1,
      "sequence_name": "문제 제기",
      "sequence_description": "시퀀스의 목적과 역할 설명"
    },
    {
      "sequence_id": 2,
      "sequence_name": "배경 설명", 
      "sequence_description": "시퀀스의 목적과 역할 설명"
    }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "sequence_id": 1,
      "sequence_name": "문제 제기",
      "scene_type": "표&그래프|자료|애니메이션|interview", 
      "original_script_text": "원본 스크립트 텍스트 (수정 금지)",
      "director_guide": "시퀀스 맥락과 ${contentType} 장르 특성을 고려한 상세한 연출 방안",
      "semantic_boundary": "장소변화|시간변화|상황전환|화자변경|주제전환|톤변화|단락완성|씬타입변화",
      "semantic_note": "씬 분할 이유에 대한 간단한 설명",
      "characters": ["존 왕 캐릭터(13세기 잉글랜드 군주)", "엘리자베스 2세(21세기 영국 여왕)"],
      "backgrounds": ["13세기 영국 전쟁터"],
      "props": ["마그나카르타 문서", "테크트리 UI", "타임라인 그래픽"],
      "reference_sources": ["Google", "Wikipedia", "Commons", "Met Museum", "Europeana", "DPLA"]
    }
  ]
}

원고:
${scriptText}`;
}

// 부분 파싱 시도 함수 (JSON 파싱 실패시 사용)
function attemptPartialParsing(responseText) {
  console.log('Starting partial parsing...');
  
  try {
    // 1. 마크다운 코드블록 제거 시도
    let cleanText = responseText;
    if (cleanText.includes('```json')) {
      const jsonStart = cleanText.indexOf('```json') + 7;
      cleanText = cleanText.substring(jsonStart);
    }
    if (cleanText.includes('```')) {
      const jsonEnd = cleanText.lastIndexOf('```');
      if (jsonEnd > 0) {
        cleanText = cleanText.substring(0, jsonEnd);
      }
    }
    
    // 2. scenes 배열 부분만 추출 시도
    const scenesMatch = cleanText.match(/"scenes"\s*:\s*\[([\s\S]*)\]/);
    if (!scenesMatch) {
      console.log('No scenes array found');
      return [];
    }
    
    const scenesArrayText = scenesMatch[1];
    
    // 3. 완전한 scene 객체들만 추출
    const scenes = [];
    const sceneRegex = /\{\s*"scene_number"\s*:\s*\d+[\s\S]*?\}/g;
    let match;
    
    while ((match = sceneRegex.exec(scenesArrayText)) !== null) {
      try {
        const sceneText = match[0];
        // 마지막에 ,가 있으면 제거
        const cleanSceneText = sceneText.replace(/,\s*$/, '');
        const scene = JSON.parse(cleanSceneText);
        
        // 기본 필드 검증
        if (scene.scene_number && scene.original_script_text) {
          // 누락된 필드 보완
          if (!scene.scene_type) scene.scene_type = 'mixed';
          if (!scene.director_guide) scene.director_guide = '';
          if (!scene.characters) scene.characters = [];
          if (!scene.backgrounds) scene.backgrounds = [];
          if (!scene.props) scene.props = [];
          if (!scene.reference_sources) scene.reference_sources = [];
          
          scenes.push(scene);
          console.log(`Extracted scene ${scene.scene_number}`);
        }
      } catch (sceneError) {
        console.log(`Failed to parse individual scene: ${sceneError.message}`);
        continue;
      }
    }
    
    console.log(`Partial parsing successful: ${scenes.length} scenes extracted`);
    return scenes;
    
  } catch (error) {
    console.log(`Partial parsing failed: ${error.message}`);
    return [];
  }
}

// AI 응답 파싱 함수 (기존과 동일)
function parseAIResponse(responseText) {
  let jsonString = responseText;
  
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
    console.log(`Attempting to parse JSON (length: ${jsonString.length})`);
    console.log(`JSON string preview: ${jsonString.substring(0, 200)}...`);
    
    const parsed = JSON.parse(jsonString);
    
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error('scenes 배열이 없습니다');
    }
    
    parsed.scenes.forEach((scene, index) => {
      if (!scene.scene_number) scene.scene_number = index + 1;
      if (!scene.original_script_text) {
        throw new Error(`씬 ${scene.scene_number}에 스크립트가 없습니다`);
      }
      
      if (!scene.scene_type) scene.scene_type = 'mixed';
      if (!scene.director_guide) scene.director_guide = '';
      if (!scene.characters) scene.characters = [];
      if (!scene.backgrounds) scene.backgrounds = [];
      if (!scene.props) scene.props = [];
      if (!scene.reference_sources) scene.reference_sources = [];
      
      scene.metadata = {
        scene_type: scene.scene_type,
        reference_sources: scene.reference_sources,
        analysis_version: '2.0'
      };
    });
    
    return parsed;
  } catch (error) {
    console.log(`JSON parsing failed. Original response length: ${responseText.length}`);
    console.log(`Processed JSON string length: ${jsonString.length}`);
    console.log(`Error: ${error.message}`);
    throw new Error(`JSON 파싱 실패: ${error.message}`);
  }
}

// 캐릭터 분석 함수 (기존과 동일)
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
  
  return { mainCharacters, allCharacters };
}