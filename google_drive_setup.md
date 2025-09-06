# 🔐 Google Drive Service Account 설정 가이드

FAL AI 파일의 7일 보관 제한으로 인해 Google Drive Service Account를 사용한 백업 시스템을 구축합니다.

## 📋 단계별 설정 가이드

### 1️⃣ Google Cloud Console 프로젝트 설정

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com 방문
   - Google 계정으로 로그인

2. **새 프로젝트 생성**
   - 상단 프로젝트 선택기 클릭
   - "새 프로젝트" 선택
   - 프로젝트 이름: `kairos-ai-backup`
   - 조직: 선택사항
   - "만들기" 클릭

3. **Google Drive API 활성화**
   - 왼쪽 메뉴 → API 및 서비스 → 라이브러리
   - "Google Drive API" 검색
   - "Google Drive API" 선택 → "사용" 클릭

### 2️⃣ Service Account 생성

1. **서비스 계정 만들기**
   - 왼쪽 메뉴 → API 및 서비스 → 사용자 인증 정보
   - "사용자 인증 정보 만들기" → "서비스 계정" 선택

2. **서비스 계정 정보 입력**
   - 서비스 계정 이름: `kairos-backup-service`
   - 서비스 계정 ID: `kairos-backup-service` (자동 생성)
   - 설명: `Kairos AI 파일 백업용 서비스 계정`
   - "만들기 및 계속하기" 클릭

3. **역할 할당 (선택사항)**
   - 이 단계는 건너뛰어도 됩니다
   - "계속" 클릭

4. **사용자 액세스 권한 (선택사항)**
   - 이 단계도 건너뛰어도 됩니다
   - "완료" 클릭

### 3️⃣ Service Account 키 생성

1. **서비스 계정 목록**
   - 생성된 서비스 계정 `kairos-backup-service` 클릭

2. **키 생성**
   - "키" 탭 선택
   - "키 추가" → "새 키 만들기"
   - 키 유형: "JSON" 선택
   - "만들기" 클릭
   - JSON 파일이 자동으로 다운로드됩니다 ⚠️ **안전하게 보관하세요!**

### 4️⃣ Google Drive 폴더 준비

1. **백업 폴더 생성**
   - Google Drive (https://drive.google.com) 접속
   - 새 폴더 생성: `Kairos AI Backup`

2. **서비스 계정에 권한 부여**
   - 생성한 폴더 우클릭 → "공유"
   - 서비스 계정 이메일 추가: `kairos-backup-service@your-project-id.iam.gserviceaccount.com`
   - 권한: "편집자" 선택
   - "공유" 클릭

3. **폴더 ID 확인**
   - 폴더 열기
   - URL에서 폴더 ID 확인: `https://drive.google.com/drive/folders/[FOLDER_ID]` 1AmJst5jMLAIaocjdZbsNcVHj9I1GCjcT
   - FOLDER_ID 부분을 복사해 둡니다

## 🔧 환경 변수 설정

다운로드받은 JSON 키 파일을 열어 다음 정보를 확인합니다:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "kairos-backup-service@your-project-id.iam.gserviceaccount.com",
  "client_id": "your-client-id"
}
```

### `.env` 파일 업데이트

```bash
# 기존 환경 변수들...
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Drive Service Account 설정
GOOGLE_DRIVE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-content\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_CLIENT_EMAIL=kairos-backup-service@your-project-id.iam.gserviceaccount.com
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_FOLDER_ID=your-backup-folder-id
```

⚠️ **주의사항:**
- `GOOGLE_DRIVE_PRIVATE_KEY`의 `\n`은 실제 줄바꿈이 아닌 문자열입니다
- 따옴표로 전체를 감싸야 합니다
- JSON 파일의 private_key를 그대로 복사하세요

## 🧪 백업 테스트

### 1. 데이터베이스 마이그레이션 실행
```sql
-- Supabase SQL Editor에서 실행
\i database/migrations/add_backup_columns.sql
```

### 2. 백업 함수 테스트
```bash
# 로컬 개발 서버 시작
netlify dev

# 업스케일 비디오 1개 백업 테스트
curl -X POST http://localhost:8888/.netlify/functions/backupToGoogleDrive \
  -H "Content-Type: application/json" \
  -d '{"type": "upscale", "limit": 1}'
```

### 3. 백업 상태 확인
```sql
-- 백업 상태 확인
SELECT 
  id,
  generation_model,
  backup_drive_url,
  backup_drive_file_id,
  backed_up_at,
  backup_status
FROM gen_videos 
WHERE backup_drive_url IS NOT NULL
LIMIT 5;
```

## 🚀 본격적인 백업 실행

테스트가 성공하면 본격적인 백업을 시작합니다:

```bash
# 1순위: 업스케일 비디오 (용량이 큰 것부터)
curl -X POST http://localhost:8888/.netlify/functions/backupToGoogleDrive \
  -H "Content-Type: application/json" \
  -d '{"type": "upscale", "limit": 10}'

# 2순위: 일반 비디오
curl -X POST http://localhost:8888/.netlify/functions/backupToGoogleDrive \
  -H "Content-Type: application/json" \
  -d '{"type": "regular", "limit": 20}'

# 3순위: 이미지
curl -X POST http://localhost:8888/.netlify/functions/backupToGoogleDrive \
  -H "Content-Type: application/json" \
  -d '{"type": "images", "limit": 30}'
```

## 🔍 트러블슈팅

### 오류 1: "Invalid credentials"
- JSON 키 파일의 내용을 다시 확인
- private_key의 줄바꿈 문자(`\n`) 확인
- 환경 변수 이름 오타 확인

### 오류 2: "Insufficient Permission"
- Google Drive 폴더에서 서비스 계정 권한 확인
- 서비스 계정 이메일 주소 정확성 확인

### 오류 3: "API not enabled"
- Google Cloud Console에서 Google Drive API 활성화 확인

### 오류 4: "Folder not found"
- GOOGLE_DRIVE_FOLDER_ID 값 확인
- 폴더 ID는 Google Drive URL에서 추출

## 📊 모니터링

### 백업 진행률 확인
```sql
-- 업스케일 비디오 백업 현황
SELECT 
  COUNT(*) as total,
  COUNT(backup_drive_url) as backed_up,
  COUNT(backup_drive_url) * 100.0 / COUNT(*) as percentage
FROM gen_videos 
WHERE upscale_video_url IS NOT NULL;
```

### 저장 공간 사용량
```sql
-- 백업된 파일들의 총 용량
SELECT 
  pg_size_pretty(
    COALESCE(SUM(upscale_file_size), 0) + 
    COALESCE(SUM(file_size), 0)
  ) as total_backed_up_size
FROM gen_videos 
WHERE backup_drive_url IS NOT NULL;
```

## 💡 추가 권장사항

1. **정기 백업 자동화**: 크론 작업으로 새로 생성된 파일 자동 백업
2. **모니터링 알림**: 백업 실패 시 알림 시스템 구축
3. **용량 관리**: 구글 드라이브 용량 모니터링
4. **보안**: 서비스 계정 키 파일 안전 보관
5. **복구 테스트**: 정기적으로 백업 파일 복구 테스트 수행