#!/usr/bin/env node

// HeyGen 아바타 비디오 생성 상태 체크 테스트
import 'dotenv/config';
import { handler } from './netlify/functions/checkPhotoAvatarStatus.js';

console.log('🔍 HeyGen 아바타 비디오 상태 체크 테스트 시작...');

const testVideoId = '5341d93e3db74eb68788a0f730684ee1'; // 이전 테스트에서 생성된 비디오 ID

async function testHeyGenStatus() {
  console.log(`📋 비디오 ID: ${testVideoId}`);
  
  // API 키 확인
  if (!process.env.HEYGEN_API_KEY) {
    console.log('❌ HEYGEN_API_KEY가 설정되지 않았습니다.');
    return;
  }
  
  console.log('✅ HEYGEN_API_KEY가 설정되어 있습니다.');
  
  try {
    console.log('\n🚀 HeyGen 상태 체크 API 호출 중...');
    
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ job_id: testVideoId })
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
        if (response.photo_urls && response.photo_urls.length > 0) {
          console.log('🎬 생성된 비디오 URL:');
          response.photo_urls.forEach((url, index) => {
            console.log(`   ${index + 1}. ${url}`);
          });
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
    console.log('\n🔍 문제 해결 방법:');
    console.log('1. 네트워크 연결 확인');
    console.log('2. API 키 유효성 확인'); 
    console.log('3. 비디오 ID 정확성 확인');
    console.log('4. HeyGen API 서비스 상태 확인');
  }
}

// 사용 가이드 출력
function printStatusGuide() {
  console.log('\n📚 HeyGen 상태 확인 가이드:');
  
  console.log('\n📊 가능한 상태:');
  console.log('- processing: 비디오 생성 진행 중');
  console.log('- completed: 비디오 생성 완료');
  console.log('- failed: 비디오 생성 실패');
  
  console.log('\n⏰ 예상 처리 시간:');
  console.log('- 일반적으로 1-3분 소요');
  console.log('- 복잡한 아바타의 경우 더 오래 걸릴 수 있음');
  
  console.log('\n🔄 폴링 권장사항:');
  console.log('- 30초마다 상태 확인');
  console.log('- 최대 10분까지 대기');
  console.log('- 실패 시 새로운 요청 생성');
  
  console.log('\n💡 다음 단계:');
  console.log('- 완료된 비디오는 7일간 유지');
  console.log('- 필요시 백업 시스템 활용');
  console.log('- 웹훅 설정으로 자동 알림 가능');
}

// 메인 실행
async function main() {
  printStatusGuide();
  await testHeyGenStatus();
}

main().catch(console.error);