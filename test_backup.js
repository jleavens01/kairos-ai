#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';

// Google Drive 백업 함수 직접 테스트
import { handler } from './netlify/functions/backupToGoogleDrive.js';

// 테스트 이벤트 생성
const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    type: 'upscale',
    limit: 1
  })
};

console.log('🧪 Google Drive 백업 테스트 시작...');
console.log(`테스트 조건: ${testEvent.body}`);

try {
  const result = await handler(testEvent);
  
  console.log('\n📊 테스트 결과:');
  console.log(`Status: ${result.statusCode}`);
  console.log('Response:');
  console.log(JSON.stringify(JSON.parse(result.body), null, 2));
  
} catch (error) {
  console.error('❌ 테스트 실패:', error);
  
  // 상세 에러 정보
  if (error.message) {
    console.error('에러 메시지:', error.message);
  }
  if (error.stack) {
    console.error('스택 트레이스:', error.stack);
  }
}