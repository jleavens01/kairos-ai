#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';
import { handler } from './netlify/functions/backupToSupabaseStorage.js';

console.log('🚀 업스케일 비디오 백업 테스트...');

const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    type: 'upscale', // 업스케일 비디오
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
  
  if (responseBody.success) {
    if (responseBody.backed_up > 0) {
      console.log('\n✅ 백업 성공!');
      console.log(`백업 완료: ${responseBody.backed_up}개`);
      
      // 백업된 파일 정보 출력
      if (responseBody.details && responseBody.details[0]) {
        const detail = responseBody.details[0];
        console.log(`\n📱 백업된 업스케일 파일:`);
        console.log(`- 원본: ${detail.originalUrl}`);
        console.log(`- 백업: ${detail.publicUrl}`);
        console.log(`- 파일명: ${detail.fileName}`);
      }
    } else if (responseBody.failed > 0) {
      console.log('\n❌ 백업 실패');
      console.log(`실패한 파일: ${responseBody.failed}개`);
      
      // 실패 상세 정보 출력
      if (responseBody.details) {
        responseBody.details
          .filter(detail => !detail.success)
          .forEach((detail, index) => {
            console.log(`\n${index + 1}. ${detail.fileName}`);
            console.log(`   오류: ${detail.error}`);
          });
      }
    } else {
      console.log('\n⭕ 백업할 업스케일 파일이 없습니다.');
      console.log('모든 업스케일 파일이 이미 백업되었거나 크기 제한으로 백업 불가능합니다.');
    }
  } else {
    console.log('\n❌ 백업 작업 실패');
    console.log(`오류: ${responseBody.error}`);
  }
  
} catch (error) {
  console.error('❌ 테스트 실패:', error);
}