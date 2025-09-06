#!/usr/bin/env node

// 환경 변수 로드
import 'dotenv/config';
import { handler } from './netlify/functions/backupToSupabaseStorage.js';

console.log('🎬 일반 비디오 대량 백업 시작...');

const BATCH_SIZE = 5; // 비디오는 더 크므로 5개씩
const MAX_BATCHES = 100; // 최대 100배치 (안전장치)
const DELAY_BETWEEN_BATCHES = 5000; // 5초 대기 (비디오는 처리 시간이 더 김)

let totalBacked = 0;
let totalFailed = 0;
let batchCount = 0;
let consecutiveEmpty = 0;

console.log('일반 비디오 (non-upscale) 파일들을 백업합니다...');

for (let batch = 0; batch < MAX_BATCHES; batch++) {
  batchCount++;
  console.log(`\n📦 배치 ${batchCount}/${MAX_BATCHES} (${BATCH_SIZE}개씩)...`);
  
  try {
    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        type: 'regular', // 일반 비디오 (업스케일 아님)
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
          console.log('✨ 모든 일반 비디오 백업 완료!');
          break;
        }
      } else {
        consecutiveEmpty = 0; // 성공하면 카운트 리셋
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
  
  // 배치 간 대기 (API 부하 방지)
  if (batch < MAX_BATCHES - 1 && consecutiveEmpty < 3) {
    console.log(`⏳ ${DELAY_BETWEEN_BATCHES/1000}초 대기...`);
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }
}

console.log('\n🎉 일반 비디오 백업 완료!');
console.log(`📊 최종 결과: ${totalBacked}개 성공, ${totalFailed}개 실패`);
console.log(`💾 백업된 용량: 약 ${Math.round(totalBacked * 4)} MB`); // 일반 비디오 평균 4MB

// 실패한 파일 분석을 위한 SQL
console.log('\n💡 실패한 파일 분석 SQL:');
console.log(`
-- 실패한 일반 비디오들 (크기별)
SELECT 
  id,
  generation_model,
  file_size,
  COALESCE(storage_video_url, result_video_url) as video_url,
  backup_status,
  created_at
FROM gen_videos 
WHERE (storage_video_url IS NOT NULL OR result_video_url IS NOT NULL)
  AND upscale_video_url IS NULL  -- 업스케일이 아닌 일반 비디오
  AND (backup_storage_url IS NULL OR backup_status = 'failed')
ORDER BY file_size DESC
LIMIT 10;
`);