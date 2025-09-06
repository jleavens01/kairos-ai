#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';

// Supabase Storage 백업 함수 테스트
import { handler } from './netlify/functions/backupToSupabaseStorage.js';

// 테스트 이벤트 생성
const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    type: 'upscale',
    limit: 1
  })
};

console.log('🧪 Supabase Storage 백업 테스트 시작...');
console.log(`테스트 조건: ${testEvent.body}`);

try {
  const result = await handler(testEvent);
  
  console.log('\n📊 테스트 결과:');
  console.log(`Status: ${result.statusCode}`);
  
  const responseBody = JSON.parse(result.body);
  console.log('Response:');
  console.log(JSON.stringify(responseBody, null, 2));
  
  if (responseBody.success) {
    console.log('\n✅ 백업 성공!');
    console.log(`백업 완료: ${responseBody.backed_up}개`);
    console.log(`백업 실패: ${responseBody.failed}개`);
  } else {
    console.log('\n❌ 백업 실패');
  }
  
} catch (error) {
  console.error('❌ 테스트 실패:', error);
  
  if (error.message) {
    console.error('에러 메시지:', error.message);
  }
}