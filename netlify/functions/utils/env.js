// 환경변수 헬퍼 유틸리티
// Netlify Functions에서 환경변수를 안전하게 가져오기

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

export function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getGoogleApiKey() {
  return process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
}

export function getFalKey() {
  return process.env.FAL_KEY || process.env.VITE_FAL_KEY;
}

// 디버깅용
export function logEnvStatus() {
  console.log('Environment Variables Status:', {
    supabaseUrl: !!getSupabaseUrl(),
    supabaseAnonKey: !!getSupabaseAnonKey(),
    supabaseServiceRoleKey: !!getSupabaseServiceRoleKey(),
    googleApiKey: !!getGoogleApiKey(),
    falKey: !!getFalKey()
  });
}