// HeyGen 간단한 테스트 스크립트
// 세상의모든지식 아바타로 테스트 비디오 생성

import fs from 'fs';

const AVATAR_ID = 'f68eecf1d1d04a1da4b1dc05d259aa4b';

async function testHeyGenSimple() {
  console.log('🎬 HeyGen 아바타 테스트 시작...');
  console.log(`📍 아바타 ID: ${AVATAR_ID}`);
  console.log(`📍 아바타 이름: 세상의모든지식`);
  
  // 간단한 형식으로 데이터 구성 (모달에서 사용하는 형식)
  const testData = {
    avatarId: AVATAR_ID,
    avatarType: 'avatar',
    text: '안녕하세요. 세상의모든지식 입니다. 지금은 테스트 중입니다.',
    voiceId: '131fc628f6924abcbd1782d498e9871f'
  };

  try {
    // AvatarVideoGenerationModal.vue에서 사용하는 형식으로 변환
    const apiData = {
      video_inputs: [{
        character: {
          type: testData.avatarType,
          avatar_id: testData.avatarId
        },
        voice: {
          type: 'text',
          voice_id: testData.voiceId,
          input_text: testData.text
        }
      }],
      dimension: {
        width: 1280,
        height: 720
      },
      test: true
    };

    // Netlify 함수 호출
    console.log('\n📤 비디오 생성 요청 중...');
    console.log('요청 데이터:', JSON.stringify(apiData, null, 2));
    
    const response = await fetch('http://localhost:8888/.netlify/functions/generateHeyGenAvatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('API 응답:', result);
      throw new Error(`API 오류: ${result.error || JSON.stringify(result)}`);
    }

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
      text: testData.text,
      timestamp: new Date().toISOString(),
      creditCost: result.credit_cost || 500
    };
    
    fs.writeFileSync(
      'heygen_simple_test_result.json', 
      JSON.stringify(testResult, null, 2)
    );
    
    console.log('\n✅ 테스트 결과가 heygen_simple_test_result.json 파일에 저장되었습니다.');
    return testResult;
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    
    // 오류 정보 저장
    const errorResult = {
      success: false,
      error: error.message,
      avatarId: AVATAR_ID,
      avatarName: '세상의모든지식',
      text: testData.text,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      'heygen_simple_test_error.json',
      JSON.stringify(errorResult, null, 2)
    );
    
    console.log('오류 정보가 heygen_simple_test_error.json 파일에 저장되었습니다.');
    throw error;
  }
}

// 실행
testHeyGenSimple()
  .then(() => {
    console.log('\n✅ 모든 테스트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  });

export { testHeyGenSimple };