#!/usr/bin/env node

// HeyGen 일반 비디오 생성 상태 체크 테스트
import 'dotenv/config';
import { handler } from './netlify/functions/checkHeyGenVideoStatus.js';

console.log('🔍 HeyGen 일반 비디오 상태 체크 테스트 시작...');

const testVideoId = '5341d93e3db74eb68788a0f730684ee1'; // 이전 테스트에서 생성된 비디오 ID

async function testHeyGenVideoStatus() {
  console.log(`📋 비디오 ID: ${testVideoId}`);
  
  // API 키 확인
  if (!process.env.HEYGEN_API_KEY) {
    console.log('❌ HEYGEN_API_KEY가 설정되지 않았습니다.');
    return;
  }
  
  console.log('✅ HEYGEN_API_KEY가 설정되어 있습니다.');
  
  try {
    console.log('\n🚀 HeyGen 비디오 상태 체크 API 호출 중...');
    
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ video_id: testVideoId })
    };
    
    const result = await handler(event);
    
    console.log('\n📊 응답 상태:', result.statusCode);
    console.log('📋 응답 내용:');
    
    const response = JSON.parse(result.body);
    console.log(JSON.stringify(response, null, 2));
    
    if (result.statusCode === 200 && response.success) {
      console.log('\n✅ 상태 체크 성공!');
      console.log(`📊 현재 상태: ${response.status}`);
      console.log(`⏳ 진행률: ${response.progress}%`);
      
      if (response.status === 'completed') {
        console.log('🎉 비디오 생성 완료!');
        if (response.video_url) {
          console.log(`🎬 생성된 비디오 URL: ${response.video_url}`);
        }
      } else if (response.status === 'processing') {
        console.log('⏳ 아직 처리 중입니다. 잠시 후 다시 확인해주세요.');
      } else if (response.status === 'failed') {
        console.log('❌ 비디오 생성에 실패했습니다.');
        console.log(`💬 오류 메시지: ${response.error_message}`);
      }
      
    } else if (result.statusCode === 404) {
      console.log('\n❓ 비디오 ID를 찾을 수 없거나 아직 처리 중일 수 있습니다.');
      console.log('💡 비디오 생성이 아직 진행 중이거나 잘못된 ID일 수 있습니다.');
      
    } else {
      console.log('\n❌ 예상치 못한 응답을 받았습니다.');
      if (response.error) {
        console.log(`💬 오류: ${response.error}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error.message);
  }
}

// 메인 실행
async function main() {
  await testHeyGenVideoStatus();
  
  console.log('\n📝 참고사항:');
  console.log('- HeyGen API 엔드포인트가 정확하지 않을 수 있습니다.');
  console.log('- API 문서를 확인하여 올바른 엔드포인트를 사용해야 합니다.');
  console.log('- v1/video_status.get 대신 다른 엔드포인트가 필요할 수 있습니다.');
}

main().catch(console.error);