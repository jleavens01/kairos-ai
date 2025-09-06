#!/bin/bash

# 배치별로 파일 사이즈 업데이트하는 스크립트
# 3개씩 처리하여 타임아웃 방지

BATCH_SIZE=3
TOTAL_BATCHES=20  # 60개 파일 처리
BASE_URL="http://localhost:8888/.netlify/functions/updateExistingFileSizes"

echo "🚀 파일 사이즈 배치 업데이트 시작"
echo "배치 크기: $BATCH_SIZE"
echo "총 배치 수: $TOTAL_BATCHES"
echo "=================================="

TOTAL_UPDATED=0
TOTAL_FAILED=0

for i in $(seq 0 $((TOTAL_BATCHES - 1))); do
    OFFSET=$((8 + i * BATCH_SIZE))  # 이미 처리된 8개 건너뛰기
    
    echo -n "📦 배치 $((i + 1))/$TOTAL_BATCHES (offset: $OFFSET)... "
    
    RESPONSE=$(curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d "{\"limit\": $BATCH_SIZE, \"table\": \"both\", \"offset\": $OFFSET}")
    
    if [ $? -eq 0 ]; then
        UPDATED=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | tail -1 | cut -d':' -f2)
        FAILED=$(echo "$RESPONSE" | grep -o '"failed":{[^}]*"total":[0-9]*' | grep -o '[0-9]*$')
        
        if [ -n "$UPDATED" ]; then
            TOTAL_UPDATED=$((TOTAL_UPDATED + UPDATED))
            echo "✅ $UPDATED개 완료"
        else
            echo "⚠️ 응답 파싱 실패"
        fi
        
        if [ -n "$FAILED" ] && [ "$FAILED" -gt 0 ]; then
            TOTAL_FAILED=$((TOTAL_FAILED + FAILED))
            echo "   ❌ $FAILED개 실패"
        fi
    else
        echo "❌ 요청 실패"
        TOTAL_FAILED=$((TOTAL_FAILED + BATCH_SIZE))
    fi
    
    # 배치 간 대기 (API 제한 방지)
    if [ $i -lt $((TOTAL_BATCHES - 1)) ]; then
        echo "   ⏳ 2초 대기..."
        sleep 2
    fi
done

echo "=================================="
echo "🎉 배치 업데이트 완료!"
echo "총 업데이트: $TOTAL_UPDATED개"
echo "총 실패: $TOTAL_FAILED개"
echo "성공률: $(( TOTAL_UPDATED * 100 / (TOTAL_UPDATED + TOTAL_FAILED) ))%"