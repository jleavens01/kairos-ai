#!/bin/bash

# 남은 파일들을 빠르게 처리하는 스크립트
# 현재 진행 상황: 이미지 91개, 비디오 89개 완료

BATCH_SIZE=5  # 조금 더 크게
CURRENT_PROCESSED=180  # 현재까지 처리된 파일 수
TARGET_TOTAL=600  # 예상 총 파일 수
BASE_URL="http://localhost:8888/.netlify/functions/updateExistingFileSizes"

echo "🚀 남은 파일 사이즈 업데이트 재개"
echo "현재 처리 완료: $CURRENT_PROCESSED개"
echo "배치 크기: $BATCH_SIZE개"
echo "=================================="

BATCH_COUNT=0
TOTAL_UPDATED=0
CONSECUTIVE_EMPTY=0

# 현재 offset부터 시작해서 빈 배치가 3번 연속 나올 때까지 계속
while [ $CONSECUTIVE_EMPTY -lt 3 ]; do
    OFFSET=$(( CURRENT_PROCESSED + BATCH_COUNT * BATCH_SIZE ))
    BATCH_COUNT=$(( BATCH_COUNT + 1 ))
    
    echo -n "📦 배치 $BATCH_COUNT (offset: $OFFSET)... "
    
    RESPONSE=$(curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d "{\"limit\": $BATCH_SIZE, \"table\": \"both\", \"offset\": $OFFSET}")
    
    if [ $? -eq 0 ]; then
        # JSON에서 updated 총합 추출
        UPDATED=$(echo "$RESPONSE" | grep -o '"updated":{"images":[0-9]*,"videos":[0-9]*,"total":[0-9]*' | grep -o 'total":[0-9]*' | cut -d':' -f2)
        
        if [ -n "$UPDATED" ] && [ "$UPDATED" -gt 0 ]; then
            TOTAL_UPDATED=$(( TOTAL_UPDATED + UPDATED ))
            CONSECUTIVE_EMPTY=0
            echo "✅ $UPDATED개 업데이트 완료 (총 $TOTAL_UPDATED개)"
        else
            CONSECUTIVE_EMPTY=$(( CONSECUTIVE_EMPTY + 1 ))
            echo "⭕ 업데이트할 파일 없음 (연속 $CONSECUTIVE_EMPTY번째)"
        fi
    else
        echo "❌ 요청 실패"
        CONSECUTIVE_EMPTY=$(( CONSECUTIVE_EMPTY + 1 ))
    fi
    
    # API 제한 방지를 위한 대기
    if [ $CONSECUTIVE_EMPTY -lt 3 ]; then
        echo "   ⏳ 3초 대기..."
        sleep 3
    fi
    
    # 안전장치: 최대 100배치까지만
    if [ $BATCH_COUNT -ge 100 ]; then
        echo "⚠️ 최대 배치 수 도달, 중단"
        break
    fi
done

echo "=================================="
echo "🎉 업데이트 완료!"
echo "이번 세션에서 처리: $TOTAL_UPDATED개"
echo "총 처리 예상: $(( CURRENT_PROCESSED + TOTAL_UPDATED ))개"

# 최종 상태 확인을 위한 SQL 쿼리 생성
cat > final_status_check.sql << EOF
-- 최종 처리 상태 확인
SELECT 
    'Final Status' as category,
    (SELECT COUNT(*) FROM gen_images WHERE file_size IS NOT NULL AND file_size > 0) as images_done,
    (SELECT COUNT(*) FROM gen_videos WHERE file_size IS NOT NULL AND file_size > 0) as videos_done,
    (SELECT COUNT(*) FROM gen_images WHERE file_size IS NOT NULL AND file_size > 0) +
    (SELECT COUNT(*) FROM gen_videos WHERE file_size IS NOT NULL AND file_size > 0) as total_done,
    pg_size_pretty(
        (SELECT COALESCE(SUM(file_size), 0) FROM gen_images WHERE file_size IS NOT NULL AND file_size > 0) +
        (SELECT COALESCE(SUM(file_size), 0) FROM gen_videos WHERE file_size IS NOT NULL AND file_size > 0) +
        (SELECT COALESCE(SUM(upscale_file_size), 0) FROM gen_videos WHERE upscale_file_size IS NOT NULL AND upscale_file_size > 0)
    ) as total_storage;
EOF

echo ""
echo "💡 최종 상태 확인을 위해 다음 SQL을 실행하세요:"
echo "   final_status_check.sql"