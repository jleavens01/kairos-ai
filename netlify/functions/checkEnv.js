// 환경변수 확인용 디버깅 함수
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey, getGoogleApiKey, getFalKey } from './utils/env.js';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  // 환경변수 확인 (민감한 정보는 일부만 표시)
  const envInfo = {
    // Google API Key
    googleApiKey: {
      hasKey: !!getGoogleApiKey(),
      source: process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : process.env.VITE_GOOGLE_API_KEY ? 'VITE_GOOGLE_API_KEY' : 'not set',
      length: getGoogleApiKey() ? getGoogleApiKey().length : 0,
      prefix: getGoogleApiKey() ? getGoogleApiKey().substring(0, 8) + '...' : 'not set'
    },
    
    // FAL Key
    falKey: {
      hasKey: !!getFalKey(),
      source: process.env.FAL_KEY ? 'FAL_KEY' : process.env.VITE_FAL_KEY ? 'VITE_FAL_KEY' : 'not set',
      length: getFalKey() ? getFalKey().length : 0
    },
    
    // Supabase
    supabase: {
      url: {
        hasUrl: !!getSupabaseUrl(),
        source: process.env.SUPABASE_URL ? 'SUPABASE_URL' : process.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 'not set',
        value: getSupabaseUrl() ? getSupabaseUrl().substring(0, 30) + '...' : 'not set'
      },
      anonKey: {
        hasKey: !!getSupabaseAnonKey(),
        source: process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' : process.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : 'not set',
        length: getSupabaseAnonKey() ? getSupabaseAnonKey().length : 0
      },
      serviceRoleKey: {
        hasKey: !!getSupabaseServiceRoleKey(),
        length: getSupabaseServiceRoleKey() ? getSupabaseServiceRoleKey().length : 0
      }
    },
    
    nodeEnv: process.env.NODE_ENV,
    netlifyEnv: process.env.CONTEXT,
    
    // 모든 환경변수 키 (값은 표시하지 않음)
    allEnvKeys: Object.keys(process.env).sort()
  };

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(envInfo, null, 2)
  };
};