# 📦 FAL AI 파일 백업 전략

## 🚨 현재 위험 상황
- **FAL AI 파일 보관 기간**: 최소 7일만 보장
- **총 위험 파일**: 5.96GB (업스케일 비디오 위주)
- **파일 손실 가능성**: 7일 후 언제든 삭제 위험

## 🎯 백업 우선순위

### **1순위: 업스케일 비디오** (5.5GB+)
- 가장 큰 용량 (파일당 평균 수백MB)
- 재생성 비용이 매우 높음
- FAL AI 의존도가 높음

### **2순위: 일반 비디오** (340MB)
- 중간 용량 (파일당 평균 4MB)
- 재생성 가능하지만 시간과 비용 소요

### **3순위: 이미지** (25MB)
- 상대적으로 작은 용량 (파일당 평균 293KB)
- 재생성이 상대적으로 쉬움

## 💰 비용 분석

### **구글 드라이브 비용 (Service Account)**
- **15GB 무료**: 현재 6GB면 충분히 무료 범위 (개인 계정)
- **100GB**: $1.99/월 (Google One)
- **200GB**: $2.99/월 (Google One)
- **Service Account**: Google Cloud Console을 통해 관리, 프로젝트 단위 과금

### **FAL AI 재생성 비용 (예상)**
- **업스케일 비디오**: 파일당 $0.5-2.0 (모델별 상이)
- **일반 비디오**: 파일당 $0.1-0.5
- **총 재생성 비용**: $200-500 (507개 파일 기준)

## 🔧 구현 방법

### **1. 데이터베이스 준비**
```sql
-- 백업 컬럼 추가
\i database/migrations/add_backup_columns.sql
```

### **2. Google Drive Service Account 설정**

#### **Google Cloud Console 설정**
1. Google Cloud Console → 새 프로젝트 생성 또는 기존 프로젝트 선택
2. API 및 서비스 → 라이브러리 → Google Drive API 활성화
3. 사용자 인증 정보 → 서비스 계정 만들기
4. 서비스 계정 키 생성 (JSON 형식 다운로드)

#### **환경 변수 설정 (.env)**
```bash
# Google Drive Service Account 설정
GOOGLE_DRIVE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_FOLDER_ID=your-backup-folder-id  # 선택사항: 특정 폴더에 백업
```

### **3. 백업 실행**
```bash
# 1순위: 업스케일 비디오 백업
curl -X POST http://localhost:8888/.netlify/functions/backupToGoogleDrive \
  -H "Content-Type: application/json" \
  -d '{"type": "upscale", "limit": 10}'

# 2순위: 일반 비디오 백업
curl -X POST http://localhost:8888/.netlify/functions/backupToGoogleDrive \
  -H "Content-Type: application/json" \
  -d '{"type": "regular", "limit": 20}'

# 3순위: 이미지 백업
curl -X POST http://localhost:8888/.netlify/functions/backupToGoogleDrive \
  -H "Content-Type: application/json" \
  -d '{"type": "images", "limit": 30}'
```

## 📊 모니터링

### **백업 상태 확인**
```sql
-- 백업 현황 요약
SELECT * FROM backup_status_summary;

-- 백업 실패한 파일들
SELECT id, generation_model, file_size, backup_status, created_at
FROM gen_videos
WHERE backup_status = 'failed'
ORDER BY file_size DESC;
```

### **진행률 추적**
```sql
-- 업스케일 비디오 백업 진행률
SELECT 
    COUNT(*) as total_upscale_videos,
    COUNT(CASE WHEN backup_drive_url IS NOT NULL THEN 1 END) as backed_up,
    ROUND((COUNT(CASE WHEN backup_drive_url IS NOT NULL THEN 1 END)::numeric / COUNT(*)) * 100, 2) as completion_percentage,
    pg_size_pretty(SUM(COALESCE(upscale_file_size, 0))) as total_size_remaining
FROM gen_videos
WHERE upscale_video_url IS NOT NULL;
```

## 🚀 자동화 옵션

### **1. 크론 작업으로 정기 백업**
```bash
# 매일 새로운 파일들 백업
0 2 * * * curl -X POST https://your-site.netlify.app/.netlify/functions/backupToGoogleDrive -d '{"type":"upscale","limit":50}'
```

### **2. 웹훅 연동**
- 새 파일 생성 시 즉시 백업 큐에 추가
- 실시간 백업으로 파일 손실 위험 최소화

## 🔄 복구 전략

### **FAL AI 링크 실패 시 자동 전환**
```javascript
// 프론트엔드에서 FAL AI 링크 실패 시 백업 URL로 자동 전환
const getVideoUrl = (video) => {
  // FAL AI URL 우선 사용
  if (video.upscale_video_url && isUrlAccessible(video.upscale_video_url)) {
    return video.upscale_video_url;
  }
  
  // Google Drive 백업 URL 사용
  if (video.backup_drive_url) {
    return video.backup_drive_url;
  }
  
  // Supabase Storage 백업 URL 사용 (대안)
  if (video.backup_storage_url) {
    return video.backup_storage_url;
  }
  
  return null; // 모든 백업이 없는 경우
};

// URL 접근성 확인 함수 (헤드 요청)
const isUrlAccessible = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};
```

## 💡 추가 권장사항

1. **즉시 시작**: 7일 제한으로 인한 파일 손실 위험
2. **우선순위 집중**: 업스케일 파일부터 백업
3. **점진적 확장**: 백업 성공 후 일반 파일로 확장
4. **모니터링**: 백업 상태를 정기적으로 확인
5. **자동화**: 성공적으로 구축 후 자동 백업 시스템 구축