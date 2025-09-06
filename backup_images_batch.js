#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';
import { handler } from './netlify/functions/backupToSupabaseStorage.js';

console.log('🖼️ 이미지 대량 백업 시작 (628개)...');

const BATCH_SIZE = 10; // 한 번에 10개씩 처리
const MAX_BATCHES = 70; // 총 70 배치 (628개 / 10 ≈ 63배치)
const DELAY_BETWEEN_BATCHES = 3000; // 3초 대기

let totalBacked = 0;
let totalFailed = 0;
let batchCount = 0;

for (let batch = 0; batch < MAX_BATCHES; batch++) {
  batchCount++;
  console.log(`\n📦 배치 ${batchCount}/${MAX_BATCHES} (${BATCH_SIZE}개씩)...`);
  
  try {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        type: 'images',
        limit: BATCH_SIZE
      })
    });
    
    const response = JSON.parse(result.body);
    
    if (response.success) {
      totalBacked += response.backed_up || 0;
      totalFailed += response.failed || 0;
      
      console.log(`✅ 배치 완료: +${response.backed_up} 성공, +${response.failed} 실패`);
      console.log(`📊 누적: ${totalBacked}개 성공, ${totalFailed}개 실패`);
      
      // 더 이상 백업할 이미지가 없으면 중단
      if (response.backed_up === 0 && response.failed === 0) {
        console.log('✨ 모든 이미지 백업 완료!');
        break;
      }
    } else {
      console.log(`❌ 배치 실패: ${response.error}`);
      totalFailed += BATCH_SIZE;
    }
    
  } catch (error) {
    console.error(`❌ 배치 ${batchCount} 에러:`, error.message);
    totalFailed += BATCH_SIZE;
  }
  
  // 배치 간 대기 (API 부하 방지)
  if (batch < MAX_BATCHES - 1) {
    console.log(`⏳ ${DELAY_BETWEEN_BATCHES/1000}초 대기...`);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }
}

console.log('\n🎉 이미지 백업 완료!');
console.log(`📊 최종 결과: ${totalBacked}개 성공, ${totalFailed}개 실패`);
console.log(`💾 백업된 용량: 약 ${Math.round(totalBacked * 0.04)} MB`); // 이미지 평균 40KB

// 백업 상태 확인 쿼리 생성
console.log('\n💡 백업 상태 확인 SQL:');
console.log(`
SELECT 
  backup_status,
  COUNT(*) as count,
  pg_size_pretty(SUM(COALESCE(file_size, 0))) as total_size
FROM gen_images 
WHERE storage_image_url IS NOT NULL
GROUP BY backup_status
ORDER BY backup_status;
`);