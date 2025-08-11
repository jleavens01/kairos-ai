# 이미지 폴링 시스템 가이드

## 서버 재시작 후 설정

Netlify 개발 서버를 재시작한 후, 다음과 같이 설정을 변경하세요:

### 1. AIGenerationGallery.vue 수정

`src/components/generation/AIGenerationGallery.vue` 파일의 376번째 줄 근처에서:

```javascript
// 현재 (임시):
const response = await fetch('/.netlify/functions/processImageQueue', {

// 변경 후 (서버 재시작 후):
const response = await fetch('/.netlify/functions/imagePollingWorker', {
```

### 2. 차이점

- **processImageQueue**: 기존 함수 (한 번에 10개 처리, 기본 기능)
- **imagePollingWorker**: 새로운 함수 (한 번에 5개 처리, 개선된 FAL AI 응답 처리)

### 3. 서버 재시작 방법

```bash
# 1. 현재 서버 중지
Ctrl + C

# 2. 서버 재시작
netlify dev
# 또는
npm run netlify
```

### 4. 폴링 시스템 작동 확인

콘솔에서 다음 메시지들을 확인:
- "Starting polling worker..."
- "Calling polling worker..."
- "Found X processing images, starting polling..."
- "All images processed, stopping polling"

## 문제 해결

### 404 에러가 계속 발생하는 경우

1. `.netlify` 폴더 삭제 후 재시작:
```bash
rm -rf .netlify
netlify dev
```

2. 함수 파일 권한 확인:
```bash
ls -la netlify/functions/imagePollingWorker.js
```

3. 함수 이름 확인 (대소문자 구분):
- 파일명: `imagePollingWorker.js`
- 함수 호출: `/.netlify/functions/imagePollingWorker`

### 폴링이 작동하지 않는 경우

1. 브라우저 콘솔에서 네트워크 탭 확인
2. `generation_status`가 'pending' 또는 'processing'인 이미지 확인
3. `request_id`가 있는지 확인
4. FAL API 키가 환경 변수에 설정되어 있는지 확인

## 환경 변수 확인

`.env` 파일에 다음 변수들이 있는지 확인:
- `FAL_API_KEY`
- `GOOGLE_API_KEY` (태그 추출용)
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`