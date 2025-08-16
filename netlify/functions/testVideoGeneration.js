// 비디오 생성 API 테스트 함수
import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  const { model } = event.queryStringParameters || {};
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      CONTEXT: process.env.CONTEXT,
      NETLIFY_DEV: process.env.NETLIFY_DEV,
    },
    apiKeys: {},
    modelTests: {}
  };

  // Google API 테스트
  try {
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GENERATIVE_LANGUAGE_API_KEY;
    results.apiKeys.google = {
      exists: !!googleApiKey,
      keyLength: googleApiKey ? googleApiKey.length : 0
    };

    if (googleApiKey && (model === 'veo' || model === 'all')) {
      const genAI = new GoogleGenerativeAI(googleApiKey);
      
      // Veo2 테스트
      try {
        const veo2Model = genAI.getGenerativeModel({ model: "veo-002" });
        results.modelTests.veo2 = {
          status: 'initialized',
          model: 'veo-002',
          available: true
        };
      } catch (e) {
        results.modelTests.veo2 = {
          status: 'error',
          error: e.message
        };
      }

      // Veo3 Fast 테스트
      try {
        const veo3FastModel = genAI.getGenerativeModel({ model: "veo-003-fast" });
        results.modelTests.veo3Fast = {
          status: 'initialized',
          model: 'veo-003-fast',
          available: true
        };
      } catch (e) {
        results.modelTests.veo3Fast = {
          status: 'error',
          error: e.message
        };
      }

      // Veo3 Preview 테스트
      try {
        const veo3Model = genAI.getGenerativeModel({ model: "veo-003" });
        results.modelTests.veo3 = {
          status: 'initialized',
          model: 'veo-003',
          available: true
        };
      } catch (e) {
        results.modelTests.veo3 = {
          status: 'error',
          error: e.message
        };
      }
    }
  } catch (error) {
    results.apiKeys.google = {
      error: error.message
    };
  }

  // FAL AI 테스트
  try {
    const falApiKey = process.env.FAL_API_KEY;
    results.apiKeys.fal = {
      exists: !!falApiKey,
      keyLength: falApiKey ? falApiKey.length : 0
    };

    if (falApiKey && (model === 'fal' || model === 'all')) {
      // FAL AI 모델 정보만 표시 (실제 import 없이)
      results.modelTests.fal = {
        kling: {
          model: 'fal-ai/kling-video/v1.5/pro/image-to-video',
          status: 'api_key_configured',
          available: true
        },
        hailou: {
          model: 'fal-ai/minimax-video/image-to-video',
          status: 'api_key_configured',
          available: true
        },
        seedance: {
          model: 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
          status: 'api_key_configured',
          available: true
        }
      };
    }
  } catch (error) {
    results.apiKeys.fal = {
      error: error.message
    };
  }

  // Supabase 연결 테스트
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    results.apiKeys.supabase = {
      url_exists: !!supabaseUrl,
      key_exists: !!supabaseKey,
      url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : null
    };
  } catch (error) {
    results.apiKeys.supabase = {
      error: error.message
    };
  }

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(results, null, 2)
  };
};