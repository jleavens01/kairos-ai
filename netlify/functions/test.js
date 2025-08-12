// 간단한 테스트 함수
export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Function is working!',
      timestamp: new Date().toISOString(),
      env: {
        hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
        hasViteGoogleApiKey: !!process.env.VITE_GOOGLE_API_KEY,
        hasFalKey: !!process.env.FAL_API_KEY || !!process.env.FAL_KEY,
        hasFalApiKey: !!process.env.FAL_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
        nodeVersion: process.version
      }
    })
  };
};