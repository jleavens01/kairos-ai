// 필수 환경 변수 화이트리스트
export const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'GOOGLE_API_KEY',
  'VITE_GOOGLE_API_KEY',
  'HEYGEN_API_KEY',
  'FAL_API_KEY'
];

// 필터링된 환경 변수만 반환
export function getFilteredEnv() {
  const filtered = {};
  REQUIRED_ENV_VARS.forEach(key => {
    if (process.env[key]) {
      filtered[key] = process.env[key];
    }
  });
  return filtered;
}