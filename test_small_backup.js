#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';

// Supabase Storage 백업 함수 테스트 (작은 파일)
import { handler } from './netlify/functions/backupToSupabaseStorage.js';

// 이미지부터 테스트 (작은 파일)
const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    type: 'images', // 작은 파일부터 테스트
    limit: 1
  })
};

console.log('🧪 Supabase Storage 백업 테스트 (작은 파일)...');
console.log(`테스트 조건: ${testEvent.body}`);

try {
  const result = await handler(testEvent);
  
  console.log('\n📊 테스트 결과:');
  console.log(`Status: ${result.statusCode}`);
  
  const responseBody = JSON.parse(result.body);
  console.log('Response:');
  console.log(JSON.stringify(responseBody, null, 2));
  
  if (responseBody.success && responseBody.backed_up > 0) {
    console.log('\n✅ 백업 성공!');
    console.log(`백업 완료: ${responseBody.backed_up}개`);
    console.log('이제 작은 비디오로 테스트를 진행할 수 있습니다.');
  } else {
    console.log('\n❌ 백업 실패');
  }
  
} catch (error) {
  console.error('❌ 테스트 실패:', error);
}