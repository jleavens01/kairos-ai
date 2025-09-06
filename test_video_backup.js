#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';
import { handler } from './netlify/functions/backupToSupabaseStorage.js';

console.log('🎬 일반 비디오 백업 테스트 (1개)...');

const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    type: 'regular', // 일반 비디오 (업스케일 아님)
    limit: 1
  })
};

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
    console.log('이제 대량 백업을 진행할 수 있습니다.');
    
    // 백업된 비디오 URL 테스트
    if (responseBody.details && responseBody.details[0]) {
      const videoUrl = responseBody.details[0].publicUrl;
      console.log(`\n🎥 백업된 비디오 URL: ${videoUrl}`);
      console.log('브라우저에서 확인해보세요.');
    }
  } else {
    console.log('\n❌ 백업 실패 또는 대상 없음');
  }
  
} catch (error) {
  console.error('❌ 테스트 실패:', error);
}