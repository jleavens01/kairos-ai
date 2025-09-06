#!/usr/bin/env node

/**
 * 기존 파일들의 사이즈를 업데이트하는 마이그레이션 스크립트
 * 
 * 사용법:
 * node database/migrations/update_existing_file_sizes.js
 * 
 * 옵션:
 * --limit=100 : 한 번에 처리할 레코드 수 (기본값: 50)
 * --table=images : 특정 테이블만 처리 (images, videos, both)
 * --dry-run : 실제 업데이트 없이 테스트만 실행
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경 변수 로드
const envPath = join(__dirname, '../../.env');
try {
  const envFile = readFileSync(envPath, 'utf8');
  const envLines = envFile.split('\n');
  envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.error('⚠️  .env 파일을 찾을 수 없습니다. 환경 변수를 직접 설정해주세요.');
}

// 명령행 인수 파싱
const args = process.argv.slice(2);
const options = {
  limit: 50,
  table: 'both',
  dryRun: false,
  offset: 0
};

args.forEach(arg => {
  const [key, value] = arg.split('=');
  switch (key) {
    case '--limit':
      options.limit = parseInt(value) || 50;
      break;
    case '--table':
      options.table = value || 'both';
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--offset':
      options.offset = parseInt(value) || 0;
      break;
  }
});

// Netlify 함수 호출 함수
async function callUpdateFunction(options) {
  const functionUrl = process.env.NODE_ENV === 'production' 
    ? `${process.env.SITE_URL}/.netlify/functions/updateExistingFileSizes`
    : 'http://localhost:8888/.netlify/functions/updateExistingFileSizes';
  
  console.log(`🔄 Calling update function: ${functionUrl}`);
  console.log(`📊 Options:`, options);
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN MODE: 실제 업데이트는 수행하지 않습니다.');
    return {
      success: true,
      message: 'Dry run completed',
      results: { images: { total: 0, updated: 0, failed: 0 }, videos: { total: 0, updated: 0, failed: 0 } }
    };
  }
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Function call failed:', error.message);
    throw error;
  }
}

// 진행률 표시
function showProgress(current, total, type) {
  const percentage = Math.round((current / total) * 100);
  const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
  console.log(`📈 ${type} 진행률: [${progressBar}] ${percentage}% (${current}/${total})`);
}

// 메인 실행 함수
async function main() {
  console.log('🚀 기존 파일 사이즈 업데이트 시작');
  console.log('=' .repeat(50));
  
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let hasMoreData = true;
  let currentOffset = options.offset;
  
  while (hasMoreData) {
    try {
      console.log(`\n📦 배치 처리 중 (offset: ${currentOffset}, limit: ${options.limit})`);
      
      const result = await callUpdateFunction({
        ...options,
        offset: currentOffset
      });
      
      if (!result.success) {
        console.error('❌ 배치 처리 실패:', result.error);
        break;
      }
      
      const batchProcessed = (result.processed?.images || 0) + (result.processed?.videos || 0);
      const batchUpdated = (result.updated?.images || 0) + (result.updated?.videos || 0);
      const batchFailed = (result.failed?.images || 0) + (result.failed?.videos || 0);
      
      totalProcessed += batchProcessed;
      totalUpdated += batchUpdated;
      totalFailed += batchFailed;
      
      console.log('\n📊 배치 결과:');
      console.log(`   처리됨: ${batchProcessed}`);
      console.log(`   업데이트: ${batchUpdated}`);
      console.log(`   실패: ${batchFailed}`);
      
      // 더 이상 처리할 데이터가 없으면 중단
      if (batchProcessed < options.limit) {
        hasMoreData = false;
        console.log('✅ 모든 데이터 처리 완료');
      } else {
        currentOffset += options.limit;
        console.log(`⏭️  다음 배치로 이동 (offset: ${currentOffset})`);
        
        // API 제한을 피하기 위해 잠시 대기
        console.log('⏱️  잠시 대기 중...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error('❌ 배치 처리 중 오류 발생:', error.message);
      break;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 파일 사이즈 업데이트 완료');
  console.log(`📊 최종 결과:`);
  console.log(`   총 처리: ${totalProcessed}개`);
  console.log(`   업데이트: ${totalUpdated}개`);
  console.log(`   실패: ${totalFailed}개`);
  console.log(`   성공률: ${totalProcessed > 0 ? Math.round((totalUpdated / totalProcessed) * 100) : 0}%`);
}

// 에러 핸들링
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
}