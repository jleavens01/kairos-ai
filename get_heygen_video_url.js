#!/usr/bin/env node

// HeyGen 비디오 새 URL 받기
import 'dotenv/config';

const testVideoId = '5341d93e3db74eb68788a0f730684ee1';

async function getNewVideoUrl() {
  console.log('🔗 HeyGen 비디오 새 URL 요청 중...');
  
  if (!process.env.HEYGEN_API_KEY) {
    console.log('❌ HEYGEN_API_KEY가 설정되지 않았습니다.');
    return;
  }
  
  try {
    const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${testVideoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok && result.data) {
      console.log('✅ 새 URL 받기 성공!');
      console.log('📋 비디오 정보:');
      console.log(`- 비디오 ID: ${result.data.id}`);
      console.log(`- 상태: ${result.data.status}`);
      console.log(`- 길이: ${result.data.duration}초`);
      console.log(`- 생성일: ${new Date(result.data.created_at * 1000).toLocaleString()}`);
      
      if (result.data.video_url) {
        console.log('\n🎬 비디오 URL (새로 생성됨):');
        console.log(result.data.video_url);
        console.log('\n💡 이 URL을 브라우저에서 바로 열어보세요!');
      }
      
      if (result.data.thumbnail_url) {
        console.log('\n🖼️ 썸네일 URL:');
        console.log(result.data.thumbnail_url);
      }
      
      if (result.data.gif_url) {
        console.log('\n🎞️ GIF URL:');
        console.log(result.data.gif_url);
      }
      
    } else {
      console.log('❌ URL 요청 실패:', result);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

console.log('🔍 HeyGen 비디오 새 URL 받기');
console.log(`📋 비디오 ID: ${testVideoId}`);
await getNewVideoUrl();