// AI 콘텐츠 제작 - 원고 작성 에이전트
// 연구 데이터를 바탕으로 세상의모든지식 스타일 원고 작성
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { WorldKnowledgeProfile } from '../../src/config/channelProfiles/world-knowledge.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { contentItemId, researchData, targetLength = '8-12분' } = JSON.parse(event.body);
    
    console.log('원고 작성 시작:', { contentItemId, targetLength });
    
    // 1. 작업 생성
    const { data: task, error: taskError } = await supabaseAdmin
      .from('agent_tasks')
      .insert({
        content_item_id: contentItemId,
        agent_type: 'writer',
        task_type: 'script_writing',
        status: 'in_progress',
        parameters: {
          targetLength,
          startedAt: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (taskError) throw taskError;
    
    // 2. 세상의모든지식 스타일 원고 작성
    const toneAndManner = WorldKnowledgeProfile.toneAndManner;
    const narrativeStructure = toneAndManner.narrativeStructure;
    
    const scriptPrompt = `
당신은 "세상의모든지식" YouTube 채널의 전문 작가입니다.

채널 톤앤매너:
- 톤: ${toneAndManner.writingStyle.tone}
- 보이스: ${toneAndManner.writingStyle.voice}
- 특징: ${toneAndManner.writingStyle.characteristics.join(', ')}

내러티브 구조:
- 오프닝: ${narrativeStructure.opening}
- 전개: ${narrativeStructure.development}
- 클라이맥스: ${narrativeStructure.climax}
- 결론: ${narrativeStructure.conclusion}

훅 예시: ${narrativeStructure.hooks.join(', ')}

연구 데이터:
${JSON.stringify(researchData, null, 2)}

목표 길이: ${targetLength}

다음 구조로 YouTube 영상 원고를 작성해주세요:

1. 훅 (15초): 강력한 질문이나 놀라운 사실로 시작
2. 도입 (30초): 오늘 다룰 주제 소개
3. 본론 (7-10분): 
   - 단계별로 복잡도를 높이며 설명
   - 비유와 예시 적극 활용
   - 시각 자료 큐 포함 [시각자료: 설명]
4. 클라이맥스 (1분): 핵심 인사이트나 "아하!" 모먼트
5. 결론 (30초): 실생활 적용이나 미래 전망
6. CTA (15초): 구독, 좋아요, 다음 영상 예고

원고는 대화체로 작성하되, 전문성을 잃지 마세요.
복잡한 개념은 초등학생도 이해할 수 있게 설명하세요.

출력 형식:
{
  "title": "영상 제목",
  "hook": "훅 대사",
  "sections": [
    {
      "type": "hook/intro/main/climax/conclusion/cta",
      "duration": "예상 시간",
      "script": "실제 대사",
      "visualCues": ["시각 자료 설명"],
      "keyPoints": ["핵심 포인트"]
    }
  ],
  "totalDuration": "총 예상 시간",
  "keywords": ["SEO 키워드"]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a professional YouTube script writer specializing in educational content. Write in Korean with a friendly yet professional tone."
        },
        {
          role: "user",
          content: scriptPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });
    
    const scriptData = JSON.parse(completion.choices[0].message.content);
    
    // 3. 원고를 씬으로 분할 (기존 production_sheets 활용)
    const scenes = await convertScriptToScenes(scriptData, contentItemId);
    
    // 4. 원고 저장
    const { data: script, error: scriptError } = await supabaseAdmin
      .from('content_scripts')
      .insert({
        content_item_id: contentItemId,
        script_data: scriptData,
        scenes: scenes,
        agent_task_id: task.id,
        status: 'completed',
        metadata: {
          model: "gpt-4-turbo-preview",
          tokenUsed: completion.usage?.total_tokens || 0,
          duration: scriptData.totalDuration
        }
      })
      .select()
      .single();
    
    if (scriptError) throw scriptError;
    
    // 5. 작업 완료 업데이트
    await supabaseAdmin
      .from('agent_tasks')
      .update({
        status: 'completed',
        result: scriptData,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id);
    
    // 6. 스토리보드 생성 트리거
    await triggerStoryboardGeneration(contentItemId, scriptData, scenes);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          taskId: task.id,
          scriptId: script.id,
          script: scriptData,
          scenes: scenes
        },
        message: '원고 작성이 완료되었습니다.'
      })
    };
    
  } catch (error) {
    console.error('원고 작성 오류:', error);
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

// 원고를 씬으로 변환
async function convertScriptToScenes(scriptData, contentItemId) {
  const scenes = [];
  
  scriptData.sections.forEach((section, index) => {
    scenes.push({
      scene_number: index + 1,
      scene_type: section.type,
      duration: section.duration,
      script_text: section.script,
      visual_cues: section.visualCues,
      key_points: section.keyPoints,
      content_item_id: contentItemId
    });
  });
  
  return scenes;
}

// 스토리보드 생성 트리거
async function triggerStoryboardGeneration(contentItemId, scriptData, scenes) {
  try {
    // 스토리보드 생성 작업 생성
    const { data, error } = await supabaseAdmin
      .from('agent_tasks')
      .insert({
        content_item_id: contentItemId,
        agent_type: 'visual_director',
        task_type: 'storyboard_generation',
        status: 'pending',
        priority: 85,
        parameters: {
          scriptData,
          scenes,
          style: 'world-knowledge'
        }
      });
    
    if (error) throw error;
    console.log('스토리보드 생성 작업 생성됨:', data);
    
  } catch (error) {
    console.error('스토리보드 트리거 실패:', error);
  }
}