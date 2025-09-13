#!/bin/bash

# 비디오 썸네일 배치 생성 스크립트
# 10개씩 처리하고 자동으로 재시작

echo "🎬 Starting batch video thumbnail generation..."
echo "Press Ctrl+C to stop"

# 카운터 초기화
count=0
total_processed=0

# 무한 루프
while true; do
    echo ""
    echo "🔄 Video Batch #$((count + 1)) starting at $(date '+%Y-%m-%d %H:%M:%S')"
    
    # 비디오 썸네일 생성 API 호출
    response=$(curl -s -X POST http://localhost:8888/.netlify/functions/generateVideoThumbnailsBatch)
    
    # 응답 체크
    if [ $? -eq 0 ]; then
        # 처리된 개수 추출 (JSON 파싱)
        processed=$(echo "$response" | grep -o '"processed":[0-9]*' | grep -o '[0-9]*')
        
        if [ -n "$processed" ]; then
            total_processed=$((total_processed + processed))
            echo "✅ Video Batch #$((count + 1)) completed: $processed videos processed"
            echo "📊 Total videos processed so far: $total_processed"
            
            # 처리된 비디오가 0개면 더 이상 처리할 것이 없음
            if [ "$processed" -eq 0 ]; then
                echo "✨ All videos have thumbnails! Waiting 10 minutes before checking again..."
                sleep 600  # 10분 대기
            else
                echo "⏳ Waiting 30 seconds before next batch..."
                sleep 30  # 다음 배치까지 30초 대기
            fi
        else
            echo "⚠️ Video Batch #$((count + 1)) response unclear, waiting 60 seconds..."
            sleep 60
        fi
    else
        echo "❌ Video Batch #$((count + 1)) failed, retrying in 60 seconds..."
        sleep 60
    fi
    
    count=$((count + 1))
    
    # 50번 실행마다 긴 휴식
    if [ $((count % 50)) -eq 0 ]; then
        echo "💤 Taking a 15-minute break after 50 batches..."
        sleep 900
    fi
done