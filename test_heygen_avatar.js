// HeyGen Avatar 테스트 스크립트
// 세상의모든지식 아바타로 테스트 비디오 생성

import fs from 'fs';

// 기본 HeyGen 아바타 사용 (Joshua - 항상 사용 가능)
const AVATAR_ID = 'josh_lite3_20230714';

async function testHeyGenAvatar() {
  console.log('🎬 HeyGen 아바타 테스트 시작...');
  console.log(`📍 아바타 ID: ${AVATAR_ID}`);
  console.log(`📍 아바타 이름: 세상의모든지식`);
  
  // HeyGen API 형식에 맞게 데이터 구성
  const testData = {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: AVATAR_ID
      },
      voice: {
        type: 'text',
        voice_id: '131fc628f6924abcbd1782d498e9871f', // 한국어 여성 음성
        input_text: '안녕하세요. 세상의모든지식 입니다. 지금은 테스트 중입니다.'
      }
    }],
    dimension: {
      width: 1280,
      height: 720
    },
    test: true,
    quality: 'high'
  };

  try {
    // Netlify 함수 호출 (로컬 개발 서버)
    console.log('\n📤 비디오 생성 요청 중...');
    const response = await fetch('http://localhost:8888/.netlify/functions/generateHeyGenAvatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API 오류: ${error.error || JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('✅ 비디오 생성 요청 성공!');
    console.log(`📍 비디오 ID: ${result.video_id}`);
    console.log(`📍 상태: ${result.status}`);
    
    if (result.status === 'processing') {
      console.log('\n⏳ 비디오가 백그라운드에서 생성 중입니다...');
      console.log('생성이 완료되면 갤러리에 표시됩니다.');
      console.log('예상 소요 시간: 1-3분');
    }
    
    // 결과 저장
    const testResult = {
      success: true,
      videoId: result.video_id,
      status: result.status,
      avatarId: AVATAR_ID,
      avatarName: '세상의모든지식',
      text: testData.video_inputs[0].voice.input_text,
      timestamp: new Date().toISOString(),
      creditCost: result.credit_cost || 500
    };
    
    // 결과를 파일로 저장
    fs.writeFileSync(
      'heygen_test_result.json', 
      JSON.stringify(testResult, null, 2)
    );
    
    console.log('\n✅ 테스트 결과가 heygen_test_result.json 파일에 저장되었습니다.');
    return testResult;
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    
    // 오류 정보 저장
    const errorResult = {
      success: false,
      error: error.message,
      avatarId: AVATAR_ID,
      avatarName: '세상의모든지식',
      text: testData.video_inputs[0].voice.input_text,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      'heygen_test_error.json',
      JSON.stringify(errorResult, null, 2)
    );
    
    console.log('오류 정보가 heygen_test_error.json 파일에 저장되었습니다.');
    throw error;
  }
}

// 실행
testHeyGenAvatar()
  .then(() => {
    console.log('\n✅ 모든 테스트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  });

export { testHeyGenAvatar };