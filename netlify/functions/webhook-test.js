// 웹훅 테스트 핸들러 - 웹훅 수신 확인용
export const handler = async (event) => {
  console.log('=== WEBHOOK TEST RECEIVED ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  console.log('Body:', event.body);
  console.log('Query:', event.queryStringParameters);
  console.log('=== END WEBHOOK TEST ===');
  
  // 요청 정보를 로그로 남기고 200 OK 응답
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      message: 'Webhook received',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      hasBody: !!event.body
    })
  };
};