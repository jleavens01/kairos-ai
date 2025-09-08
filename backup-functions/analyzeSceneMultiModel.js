// Multi-model scene analysis for StoryboardLab
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';

// Initialize clients
const initializeClients = () => {
  const clients = {};
  
  // OpenAI (GPT-5, GPT-4o, GPT-4o-mini)
  if (process.env.OPENAI_API_KEY) {
    clients.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  // Google (Gemini 2.5 Pro, Gemini 2.5 Flash)
  if (process.env.GOOGLE_API_KEY || process.env.GENERATIVE_LANGUAGE_API_KEY) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GENERATIVE_LANGUAGE_API_KEY;
    clients.google = new GoogleGenerativeAI(apiKey);
  }
  
  return clients;
};

// Scene analysis prompt template
const createAnalysisPrompt = (scene, context, options) => {
  let prompt = `당신은 전문 스토리보드 감독이자 비주얼 컨설턴트입니다. 다음 씬을 영상 제작 관점에서 분석해주세요.

현재 씬 (씬 ${context.sceneNumber}/${context.totalScenes}):
${scene.text}

다음 구조로 종합적인 분석을 제공해주세요:

1. 씬 요약
- 간단한 개요 (2-3문장)
- 핵심 감정/분위기
- 주요 서사 요소들

2. 시각적 연출
- 카메라 앵글 추천 (예: 클로즈업, 미디엄샷, 와이드샷)
- 색상 팔레트 (hex 코드 제공)
- 조명 설정 (자연광, 키 라이트, 로우키 등)

3. 제작 가이드
- AI 생성 프롬프트 (이미지/비디오 생성을 위한 상세하고 영화적인 설명)
- 레퍼런스 검색 키워드 (유사한 시각 자료를 찾기 위한 3-5개 키워드)
`;

  // Add context if requested
  if (options.includeContext) {
    if (context.previousScene) {
      prompt += `\n\n이전 씬:
${context.previousScene.text.substring(0, 200)}...
고려사항: 이 씬이 감정적으로, 시각적으로 어떻게 연결되는가?`;
    }
    
    if (context.nextScene) {
      prompt += `\n\n다음 씬:
${context.nextScene.text.substring(0, 200)}...
고려사항: 이 씬이 다음을 위해 어떻게 준비해야 하는가?`;
    }
  }
  
  // Add theme analysis if requested
  if (options.globalTheme && context.allScenes) {
    prompt += `\n\n전체 서사 맥락:
총 씬 수: ${context.totalScenes}
전체 스토리 아크를 고려하고 주제적 일관성을 유지하세요.`;
  }
  
  // Add emotional arc if requested
  if (options.emotionalArc) {
    prompt += `\n\n감정선 진행:
이 씬을 통해 감정 톤이 어떻게 진행되어야 하는지 분석하세요.`;
  }
  
  // Add visual continuity if requested
  if (options.visualContinuity) {
    prompt += `\n\n시각적 연속성:
시각적 요소들이 확립된 스타일과 일관성을 유지하도록 하세요.`;
  }
  
  prompt += `\n\n응답을 반드시 다음과 같은 유효한 JSON 형식으로만 제공해주세요. 다른 텍스트나 설명 없이 JSON만 출력하세요:

{
  "sceneSummary": "씬 요약 내용",
  "mood": "분위기 설명",
  "keyElements": ["주요 요소 1", "주요 요소 2", "주요 요소 3"],
  "cameraAngle": "카메라 앵글 (예: 클로즈업, 미디엄샷, 와이드샷)",
  "colorPalette": "#색상코드1, #색상코드2, #색상코드3",
  "lighting": "조명 설정 (예: 자연광, 키 라이트, 로우키)",
  "generationPrompt": "AI image/video generation prompt in English",
  "searchKeywords": ["keyword1", "keyword2", "keyword3"]${options.includeContext ? ',\n  "previousConnection": "이전 씬과의 연결",\n  "nextSetup": "다음 씬 준비"' : ''}
}`;
  
  return prompt;
};

// Model-specific analysis functions
const analyzeWithGPT5 = async (clients, prompt) => {
  if (!clients.openai) throw new Error('OpenAI client not initialized');
  
  const response = await clients.openai.chat.completions.create({
    model: 'gpt-5', // GPT-5 model identifier (adjust when available)
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
};

const analyzeWithGPT4o = async (clients, prompt) => {
  if (!clients.openai) throw new Error('OpenAI client not initialized');
  
  // JSON 모드를 사용하려면 프롬프트에 JSON을 명시해야 함
  const jsonPrompt = prompt + '\n\n반드시 유효한 JSON 객체만 응답하세요.';
  
  const response = await clients.openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: jsonPrompt }],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  });
  
  console.log('GPT-4o raw response:', response.choices[0].message.content);
  
  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (e) {
    console.error('Failed to parse GPT-4o response:', e);
    throw new Error('Failed to parse GPT-4o response');
  }
};

const analyzeWithGPT4oMini = async (clients, prompt) => {
  if (!clients.openai) throw new Error('OpenAI client not initialized');
  
  const jsonPrompt = prompt + '\n\n반드시 유효한 JSON 객체만 응답하세요.';
  
  const response = await clients.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: jsonPrompt }],
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "json_object" }
  });
  
  console.log('GPT-4o-mini raw response:', response.choices[0].message.content);
  
  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (e) {
    console.error('Failed to parse GPT-4o-mini response:', e);
    throw new Error('Failed to parse GPT-4o-mini response');
  }
};

const analyzeWithGemini25Pro = async (clients, prompt) => {
  if (!clients.google) throw new Error('Google client not initialized');
  
  const model = clients.google.getGenerativeModel({ 
    model: "gemini-2.5-pro"  // Gemini 2.5 Pro - 2025년 출시된 최신 모델
  });
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1000,
    },
  });
  
  const response = await result.response;
  const text = response.text();
  
  console.log('Gemini 2.5 Pro raw response:', text);
  
  // Parse JSON from response
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Successfully parsed Gemini response:', parsed);
      return parsed;
    }
    
    // Fallback: structure the response manually
    console.log('Using fallback structure for Gemini response');
    return {
      sceneSummary: text.substring(0, 200),
      mood: '분석됨',
      keyElements: ['주요 요소 1', '주요 요소 2'],
      cameraAngle: '미디엄샷',
      colorPalette: '#333333, #666666',
      lighting: '자연광',
      generationPrompt: text.substring(0, 150),
      searchKeywords: ['keyword1', 'keyword2']
    };
  } catch (e) {
    console.error('Failed to parse Gemini response:', e);
    console.error('Raw text was:', text);
    throw new Error('Failed to parse Gemini response');
  }
};

const analyzeWithGemini25Flash = async (clients, prompt) => {
  if (!clients.google) throw new Error('Google client not initialized');
  
  const model = clients.google.getGenerativeModel({ 
    model: "gemini-2.5-flash"  // Gemini 2.5 Flash - 2025년 출시
  });
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 800,
    },
  });
  
  const response = await result.response;
  const text = response.text();
  
  // Parse JSON from response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      sceneSummary: text.substring(0, 200),
      mood: 'analyzed',
      keyElements: ['element1', 'element2'],
      cameraAngle: 'medium shot',
      colorPalette: '#333333, #666666',
      lighting: 'natural',
      generationPrompt: text.substring(0, 150),
      searchKeywords: ['keyword1', 'keyword2']
    };
  } catch (e) {
    console.error('Failed to parse Gemini Flash response:', e);
    throw new Error('Failed to parse Gemini Flash response');
  }
};

// Claude 제거됨 - OpenAI와 Google 모델만 사용

// Main handler
export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const { modelId, scene, context, options = {} } = JSON.parse(event.body);
    
    if (!modelId || !scene || !context) {
      throw new Error('Missing required parameters');
    }
    
    const clients = initializeClients();
    const prompt = createAnalysisPrompt(scene, context, options);
    
    let result;
    const startTime = Date.now();
    
    // Route to appropriate model
    switch (modelId) {
      case 'gpt-5':
        // GPT-5 is not yet available, fallback to GPT-4o
        console.log('GPT-5 not available, using GPT-4o');
        result = await analyzeWithGPT4o(clients, prompt);
        break;
        
      case 'gpt-4o':
        result = await analyzeWithGPT4o(clients, prompt);
        break;
        
      case 'gpt-4o-mini':
        result = await analyzeWithGPT4oMini(clients, prompt);
        break;
        
      case 'gemini-2.5-pro':
        result = await analyzeWithGemini25Pro(clients, prompt);
        break;
        
      case 'gemini-2.5-flash':
        result = await analyzeWithGemini25Flash(clients, prompt);
        break;
        
      default:
        throw new Error(`Unknown model: ${modelId}`);
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        modelId,
        responseTime,
        result
      })
    };
    
  } catch (error) {
    console.error('Scene analysis error:', error);
    
    return {
      statusCode: error.message.includes('not initialized') ? 503 : 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};