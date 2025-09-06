# 기존 파일 사이즈 업데이트 가이드

기존에 저장된 이미지와 비디오 파일들의 용량을 파악하여 데이터베이스에 업데이트하는 방법을 설명합니다.

## 📋 개요

새로운 파일 사이즈 추적 시스템을 구현한 후, 기존에 생성된 파일들의 용량 정보를 업데이트하기 위한 도구들입니다.

## 🔍 1단계: 현황 파악

먼저 현재 데이터베이스의 파일 사이즈 현황을 확인해보세요.

```sql
-- Supabase SQL Editor에서 실행
\i database/migrations/check_file_size_status.sql
```

또는 파일 내용을 복사해서 Supabase SQL Editor에 붙여넣기:

```sql
-- 이미지 파일 사이즈 현황
SELECT 
    COUNT(*) as total_images,
    COUNT(CASE WHEN file_size IS NULL OR file_size = 0 THEN 1 END) as missing_file_size,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as has_file_size
FROM gen_images;

-- 비디오 파일 사이즈 현황
SELECT 
    COUNT(*) as total_videos,
    COUNT(CASE WHEN file_size IS NULL OR file_size = 0 THEN 1 END) as missing_file_size,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as has_file_size
FROM gen_videos;
```

## 🔧 2단계: 파일 사이즈 업데이트

### 방법 1: Node.js 스크립트 (권장)

```bash
# 프로젝트 루트에서 실행
cd kairos-ai

# 모든 파일 처리 (기본 50개씩)
node database/migrations/update_existing_file_sizes.js

# 특정 테이블만 처리
node database/migrations/update_existing_file_sizes.js --table=images
node database/migrations/update_existing_file_sizes.js --table=videos

# 더 많은 배치로 처리
node database/migrations/update_existing_file_sizes.js --limit=100

# 특정 오프셋부터 시작
node database/migrations/update_existing_file_sizes.js --offset=200

# 테스트 실행 (실제 업데이트 없음)
node database/migrations/update_existing_file_sizes.js --dry-run
```

### 방법 2: HTTP 요청으로 직접 호출

```bash
# 로컬 개발 환경
curl -X POST http://localhost:8888/.netlify/functions/updateExistingFileSizes \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "table": "both", "offset": 0}'

# 프로덕션 환경
curl -X POST https://your-site.netlify.app/.netlify/functions/updateExistingFileSizes \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "table": "both", "offset": 0}'
```

## 📊 3단계: 결과 확인

업데이트 완료 후 다시 현황을 확인해보세요:

```sql
-- 업데이트 후 현황 확인
SELECT 
    'gen_images' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as updated,
    pg_size_pretty(SUM(file_size)) as total_size
FROM gen_images
WHERE file_size IS NOT NULL

UNION ALL

SELECT 
    'gen_videos' as table_name,
    COUNT(*) as total,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as updated,
    pg_size_pretty(SUM(file_size + COALESCE(upscale_file_size, 0))) as total_size
FROM gen_videos
WHERE file_size IS NOT NULL;
```

## ⚙️ 설정 옵션

### updateExistingFileSizes 함수 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `limit` | number | 50 | 한 번에 처리할 레코드 수 |
| `offset` | number | 0 | 시작 오프셋 |
| `table` | string | 'both' | 처리할 테이블 ('images', 'videos', 'both') |

### Node.js 스크립트 옵션

| 플래그 | 설명 | 예시 |
|--------|------|------|
| `--limit=N` | 배치 크기 설정 | `--limit=100` |
| `--table=TYPE` | 테이블 지정 | `--table=images` |
| `--offset=N` | 시작 위치 | `--offset=200` |
| `--dry-run` | 테스트 모드 | `--dry-run` |

## 🚨 주의사항

### 성능 최적화
- **배치 크기**: 한 번에 너무 많은 파일을 처리하면 API 제한에 걸릴 수 있습니다
- **대기 시간**: 스크립트는 각 요청 사이에 적절한 대기 시간을 둡니다
- **타임아웃**: 네트워크 문제로 실패할 수 있으니 재시도가 필요할 수 있습니다

### 비용 고려사항
- FAL AI, Supabase 등의 API 호출량이 증가할 수 있습니다
- Storage 읽기 요청이 많이 발생할 수 있습니다

### 오류 처리
- 일부 파일의 URL이 유효하지 않을 수 있습니다
- 네트워크 오류나 서버 오류가 발생할 수 있습니다
- 스크립트는 오류가 있어도 계속 진행합니다

## 📈 모니터링

### 진행 상황 확인

```sql
-- 실시간 진행 상황
SELECT 
    NOW() as check_time,
    COUNT(*) as total_images,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as images_with_size,
    ROUND((COUNT(CASE WHEN file_size > 0 THEN 1 END)::numeric / COUNT(*)) * 100, 2) as completion_percentage
FROM gen_images
WHERE storage_image_url IS NOT NULL;
```

### 로그 확인

- Node.js 스크립트 실행 시 콘솔에 상세한 진행 상황이 표시됩니다
- Netlify Functions의 로그는 Netlify 대시보드에서 확인 가능합니다

## 🔄 대용량 데이터 처리

수천 개의 파일이 있는 경우:

```bash
# 단계별 처리 예시
node database/migrations/update_existing_file_sizes.js --limit=20 --offset=0
node database/migrations/update_existing_file_sizes.js --limit=20 --offset=20
node database/migrations/update_existing_file_sizes.js --limit=20 --offset=40
# ...계속
```

또는 반복 스크립트:

```bash
#!/bin/bash
for i in {0..1000..50}; do
    echo "Processing offset $i..."
    node database/migrations/update_existing_file_sizes.js --limit=50 --offset=$i
    sleep 5
done
```

## 💡 팁

1. **먼저 소량으로 테스트**: `--limit=5 --dry-run`으로 테스트
2. **진행 상황 저장**: 중간에 중단되어도 오프셋을 기록해두세요
3. **시간대 고려**: 사용자가 적은 시간대에 실행하는 것을 권장
4. **백업**: 중요한 데이터의 경우 사전에 백업을 고려해보세요

## 🛠️ 문제 해결

### 자주 발생하는 오류

1. **404 Not Found**: 파일 URL이 유효하지 않음
2. **Timeout**: 네트워크 지연, 재시도 필요
3. **Rate Limit**: API 제한, 대기 시간 증가 필요

### 해결책

```bash
# 실패한 부분부터 재시작
node database/migrations/update_existing_file_sizes.js --offset=실패한_위치

# 더 작은 배치로 처리
node database/migrations/update_existing_file_sizes.js --limit=10
```