#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';
import { handler } from './netlify/functions/backupToSupabaseStorage.js';

console.log('🚀 업스케일 비디오 대량 백업 시작...');

const BATCH_SIZE = 2; // 업스케일 파일은 크므로 2개씩 처리
const MAX_BATCHES = 20; // 최대 20배치 (19개 업스케일 파일 예상)
const DELAY_BETWEEN_BATCHES = 10000; // 10초 대기 (대용량 파일 처리 시간 고려)

let totalBacked = 0;
let totalFailed = 0;
let batchCount = 0;
let consecutiveEmpty = 0;

console.log('업스케일 비디오 파일들을 백업합니다...');

for (let batch = 0; batch < MAX_BATCHES; batch++) {
  batchCount++;
  console.log(`\n🚀 배치 ${batchCount}/${MAX_BATCHES} (${BATCH_SIZE}개씩)...`);
  
  try {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        type: 'upscale', // 업스케일 비디오
        limit: BATCH_SIZE
      })
    });
    
    const response = JSON.parse(result.body);
    
    if (response.success) {
      const backed = response.backed_up || 0;
      const failed = response.failed || 0;
      
      totalBacked += backed;
      totalFailed += failed;
      
      console.log(`✅ 배치 완료: +${backed} 성공, +${failed} 실패`);
      console.log(`📊 누적: ${totalBacked}개 성공, ${totalFailed}개 실패`);
      
      // 백업할 파일이 없으면 카운트
      if (backed === 0 && failed === 0) {
        consecutiveEmpty++;
        console.log(`⭕ 백업할 파일 없음 (연속 ${consecutiveEmpty}번째)`);
        
        // 연속 3번 비어있으면 완료
        if (consecutiveEmpty >= 3) {
          console.log('✨ 모든 업스케일 비디오 백업 완료!');
          break;
        }
      } else {
        consecutiveEmpty = 0; // 성공하면 카운트 리셋
      }
      
      // 성공한 파일들의 크기 정보 출력
      if (backed > 0 && response.details) {
        console.log('📁 백업된 파일들:');
        response.details
          .filter(detail => detail.success)
          .forEach((detail, index) => {
            const sizeMB = (detail.actualFileSize / 1024 / 1024).toFixed(2);
            console.log(`   ${index + 1}. ${detail.fileName.split('/').pop()}: ${sizeMB} MB`);
          });
      }
      
      // 실패한 파일들의 상세 정보 출력
      if (failed > 0 && response.details) {
        console.log('❌ 실패한 파일들:');
        response.details
          .filter(detail => !detail.success)
          .forEach((detail, index) => {
            console.log(`   ${index + 1}. ${detail.fileName}: ${detail.error}`);
          });
      }
      
    } else {
      console.log(`❌ 배치 실패: ${response.error}`);
      totalFailed += BATCH_SIZE;
      consecutiveEmpty++;
    }
    
  } catch (error) {
    console.error(`❌ 배치 ${batchCount} 에러:`, error.message);
    totalFailed += BATCH_SIZE;
    consecutiveEmpty++;
  }
  
  // 배치 간 대기 (대용량 파일 처리를 위한 긴 대기시간)
  if (batch < MAX_BATCHES - 1 && consecutiveEmpty < 3) {
    console.log(`⏳ ${DELAY_BETWEEN_BATCHES/1000}초 대기...`);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }
}

console.log('\n🎉 업스케일 비디오 백업 완료!');
console.log(`📊 최종 결과: ${totalBacked}개 성공, ${totalFailed}개 실패`);
console.log(`💾 백업된 용량: 약 ${Math.round(totalBacked * 200)} MB`); // 업스케일 평균 200MB

// 백업 상태 확인을 위한 SQL
console.log('\n💡 백업 상태 확인 SQL:');
console.log(`
-- 업스케일 백업 현황
SELECT 
  backup_status,
  COUNT(*) as count,
  pg_size_pretty(SUM(COALESCE(upscale_file_size, 0))) as total_size,
  pg_size_pretty(AVG(COALESCE(upscale_file_size, 0))::bigint) as avg_size
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL
GROUP BY backup_status
ORDER BY backup_status;
`);