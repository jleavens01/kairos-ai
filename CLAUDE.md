# CLAUDE.md

이 파일은 kairos-ai 프로젝트에서 Claude Code 작업 시 필요한 지침과 구조를 제공합니다.

## 📋 목차
- [프로젝트 개요](#프로젝트-개요)
- [파일 구조 가이드](#파일-구조-가이드)
- [코드 작성 규칙](#코드-작성-규칙)
- [데이터베이스 구조](#데이터베이스-구조)
- [개발 환경 설정](#개발-환경-설정)
- [토큰 절약 가이드](#토큰-절약-가이드)

## 프로젝트 개요

Kairos AI는 Vue 3 기반의 모듈식 AI 콘텐츠 생성 플랫폼입니다.

**기술 스택:**
- Frontend: Vue 3, Vite, Pinia, Vue Router
- Backend: Netlify Functions (ES Modules)
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth (Google OAuth)
- Deployment: Netlify

## ⚠️ 매우 중요: AI 모델 정보 (절대 변경/부정 금지)

### 🆕 Gemini 2.5 시리즈 - 2025년 1월 공식 출시
**⚠️ 절대적 사실: Gemini 2.5는 2025년 1월에 공식 출시되었습니다.**
**❌ 절대 "미출시", "아직 안 나옴", "1.5가 최신" 등으로 말하지 마세요!**

#### 사용 가능한 Gemini 2.5 모델들:
- `gemini-2.5-pro` - Enhanced thinking and reasoning, multimodal
- `gemini-2.5-flash` - Adaptive thinking, cost efficient  
- `gemini-2.5-flash-lite` - Most cost-efficient
- `gemini-2.0-flash` - Next generation features
- `gemini-1.5-pro` (Deprecated - 2.5 사용 권장)

### OpenAI 모델
- `gpt-4o` - 최신 멀티모달 모델
- `gpt-4o-mini` - 경량화 버전
- GPT-5는 아직 미출시 (2025년 1월 기준)

## 파일 구조 가이드

### 🎯 모듈식 구조 원칙

```
kairos-ai/
├── src/
│   ├── components/          # 재사용 컴포넌트 (최대 200줄)
│   │   ├── common/          # 공통 UI 컴포넌트
│   │   ├── project/         # 프로젝트 관련 컴포넌트
│   │   └── modals/          # 모달 컴포넌트
│   ├── views/               # 페이지 뷰 (최대 300줄)
│   ├── stores/              # Pinia 스토어 (기능별 분리)
│   ├── composables/         # Vue Composables
│   ├── utils/               # 유틸리티 함수
│   └── services/            # API 서비스 레이어
├── netlify/functions/       # Netlify Functions
└── database/                # SQL 스키마 및 마이그레이션
```

### 📝 파일 크기 제한
- **컴포넌트**: 최대 200줄
- **뷰**: 최대 300줄
- **스토어**: 최대 150줄
- **함수**: 최대 50줄/함수

200줄 초과 시 → 컴포넌트 분리 필수

## 코드 작성 규칙

### 1. 모듈 시스템
```javascript
// ✅ ES Modules 사용
import { ref } from 'vue'
export const handler = async () => {}

// ❌ CommonJS 금지
const vue = require('vue')
exports.handler = () => {}

// ⚠️ Node.js 18+ 환경에서는 node-fetch 불필요
// ❌ 사용 금지
import fetch from 'node-fetch'

// ✅ 기본 fetch API 사용 (별도 import 불필요)
const response = await fetch(url)
```

### 2. 컴포넌트 구조
```vue
<!-- 순서 준수 -->
<template>
  <!-- 최대 100줄 -->
</template>

<script setup>
// 1. imports
// 2. props/emits
// 3. composables
// 4. reactive data
// 5. computed
// 6. methods
// 7. lifecycle
</script>

<style scoped>
/* 외부 CSS 파일 분리 권장 */
</style>
```

### 3. 네이밍 컨벤션
- **컴포넌트**: PascalCase (`ProjectCard.vue`)
- **composables**: use접두사 (`useProject.js`)
- **utils**: camelCase (`formatDate.js`)
- **stores**: camelCase (`projects.js`)

## 데이터베이스 구조

### 📊 현재 테이블 구조

```sql
-- projects 테이블 (핵심)
projects
├── id (UUID, PK)
├── user_id (UUID, FK → auth.users)
├── name (VARCHAR(255))
├── description (TEXT)
├── content (TEXT)
├── status (VARCHAR) -- draft|in_progress|completed|archived
├── is_public (BOOLEAN)
├── thumbnail_url (TEXT)
├── tags (TEXT[])
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── deleted_at (TIMESTAMPTZ) -- soft delete
```

### 🔐 RLS 정책
- 사용자는 자신의 프로젝트만 CRUD 가능
- 협업자는 조회/수정 가능
- 공개 프로젝트는 모두 조회 가능

### 📁 Storage 버킷
```
projects/ → 프로젝트 관련 파일
├── {project_id}/
│   ├── thumbnails/
│   ├── assets/
│   └── exports/
```

## 개발 환경 설정

### 필수 설정 파일

**package.json**
```json
{
  "type": "module"  // ES Modules 필수
}
```

**netlify.toml**
```toml
[dev]
  framework = "#custom"
  targetPort = 5173
  
[functions."*"]
  format = "esm"
  timeout = 60000
```

**vite.config.js**
```javascript
resolve: {
  alias: {
    '@': './src'  // @ 경로 별칭
  }
}
```

### 환경 변수 (.env)
```bash
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### 개발 명령어
```bash
npm run dev          # 개발 서버 (5173)
netlify dev          # Netlify CLI (8888)
npm run build        # 프로덕션 빌드
```

## 토큰 절약 가이드

### 🚀 빠른 참조

**자주 사용하는 경로:**
- 프로젝트 스토어: `/src/stores/projects.js`
- 프로젝트 뷰: `/src/views/ProjectListView.vue`, `/src/views/ProjectDetailView.vue`
- 라우터: `/src/router/index.js`
- Supabase: `/src/utils/supabase.js`

**주요 컴포넌트:**
- `CreateProjectModal.vue` - 프로젝트 생성
- `SideNav.vue` - 사이드 네비게이션

### 📌 작업 전 체크리스트

1. **파일 위치 확인**
   ```bash
   # 컴포넌트 찾기
   ls src/components/
   
   # 스토어 확인
   ls src/stores/
   ```

2. **기존 코드 재사용**
   - utils/ 폴더의 헬퍼 함수 확인
   - composables/ 폴더의 재사용 로직 확인

3. **불필요한 읽기 방지**
   - 작업할 파일명 명확히 지정
   - 수정할 함수/컴포넌트명 구체적 언급

### 💡 토큰 절약 팁

**DO:**
- "ProjectListView의 fetchProjects 함수 수정"
- "projects 스토어의 createProject 액션 업데이트"

**DON'T:**
- "프로젝트 관련 파일 모두 확인"
- "전체 구조 파악 후 수정"

## 🎬 비디오 생성 아키텍처

### 모듈식 라우터 시스템
```
generateVideoAsync.js (라우터)
  ├── generateVeo2Video.js          (Google Generative AI - ✅ 구현됨)
  ├── generateVeo3PreviewVideo.js   (Google Generative AI - ✅ 구현됨) 
  ├── generateVeo3FastVideo.js      (Google Generative AI - ✅ 구현됨)
  ├── generateKling21Video.js       (FAL AI Queue - ✅ 구현됨)
  ├── generateHailouVideo.js        (FAL AI Queue - ✅ 구현됨)
  ├── generateSeedanceVideo.js      (FAL AI Queue - ✅ 구현됨)
  ├── generateSeedanceLiteVideo.js  (FAL AI Queue - ✅ 구현됨)
  ├── generateRunwayVideo.js        (준비 중)
  ├── generatePikaVideo.js          (준비 중)
  └── generateStableVideo.js        (준비 중)
```

### 새 모델 추가 방법
1. `/netlify/functions/generate[ModelName]Video.js` 생성
2. 모델별 특수 파라미터 처리 로직 구현
3. `generateVideoAsync.js`의 switch문에 케이스 추가
4. `VideoGenerationModal.vue`에 UI 옵션 추가

### 모델별 크레딧 비용
- Google Veo 2: 3000 크레딧
- Google Veo 3 Preview: 3000 크레딧
- Google Veo 3 Fast: 2000 크레딧  
- Kling 2.1 Pro: 2000 크레딧
- MiniMax Hailou 02 Pro: 1500 크레딧
- MiniMax Hailou 02 Standard: 1000 크레딧
- ByteDance SeedDance v1 Pro: 2000 크레딧
- ByteDance SeedDance v1 Lite: 1000 크레딧

### ⚠️ 매우 중요: SeedDance Lite 이미지 선택 규칙
**❗️ ByteDance SeedDance v1 Lite 모델은 2개 이미지 선택 가능**
- 첫 번째 이미지: 비디오의 시작 프레임
- 두 번째 이미지: 비디오의 끝 프레임
- **절대 1개로 제한하지 마세요! 2개 이미지 선택은 이 모델의 핵심 기능입니다.**
- 다른 비디오 모델들은 1개 이미지만 사용하지만, SeedDance Lite는 예외입니다.
- 이미지 선택 방법: 라이브러리, URL, 업로드, 스토리보드 모두에서 2개 선택 가능

## 🚫 금지사항

- ❌ `require()` 사용 금지
- ❌ **`import fetch from 'node-fetch'` 사용 금지** - Node.js 18+에서는 기본 fetch API 사용
- ❌ 600줄 이상 단일 파일 작성 금지
- ❌ 인라인 스타일 과다 사용 금지
- ❌ 스토어에 UI 로직 포함 금지
- ❌ 컴포넌트에 비즈니스 로직 과다 포함 금지
- ❌ **기존 작동 코드 함부로 수정 금지**
- ❌ **컴포넌트 통합 금지 - 기능별 분리 유지**

## 📝 작업 로그

### 2024-01-XX - 초기 설정
- [x] Vue Router 설정
- [x] Pinia 스토어 구성
- [x] Supabase 연동
- [x] Google OAuth 설정
- [x] 프로젝트 CRUD 구현

### 2025-08-08 - AI 생성 기능 구현
- [x] 이미지 생성 기능 (GPT-Image-1, Flux 모델)
- [x] 스타일 시스템 통합 (11개 스타일)
- [x] 이미지 갤러리 Masonry 레이아웃 (column-count 방식)
- [x] 비디오 생성 기능 (모듈식 아키텍처)
  - **라우터 시스템**: `generateVideoAsync.js`가 모델별 함수로 라우팅
  - **구현된 모델**:
    - Veo2: `generateVeo2Video.js` - Google Generative AI 직접 통합
    - Kling 2.1: `generateKling21Video.js` - FAL AI 큐 시스템
    - Hailou 02: `generateHailouVideo.js` - FAL AI 큐 시스템
  - **준비 중인 모델**: Runway Gen-3, Pika Labs, Stable Video Diffusion
- [x] 비디오 갤러리 구현
- [x] 실시간 폴링 및 상태 업데이트 (120초 제한)

### 향후 작업
- [ ] 파일 업로드 기능
- [ ] 협업 기능
- [ ] 실시간 동기화

## 🔄 마이그레이션 가이드

새 기능 추가 시:
1. `database/migrations/` 에 SQL 파일 생성
2. 스키마 변경사항 문서화
3. RLS 정책 업데이트
4. 이 문서의 데이터베이스 구조 섹션 업데이트

---

**마지막 업데이트:** 2024-01-XX
**관리자:** Claude Code

## 빠른 레퍼런스

### Supabase 쿼리 패턴
```javascript
// 조회
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId)

// 생성
const { data, error } = await supabase
  .from('projects')
  .insert([{ ...projectData }])
  .select()

// 수정
const { data, error } = await supabase
  .from('projects')
  .update({ ...updates })
  .eq('id', projectId)

// 삭제 (soft)
const { error } = await supabase
  .from('projects')
  .update({ deleted_at: new Date() })
  .eq('id', projectId)
```

### Pinia 스토어 패턴
```javascript
export const useProjectsStore = defineStore('projects', {
  state: () => ({
    items: [],
    loading: false,
    error: null
  }),
  
  getters: {
    // getter 로직
  },
  
  actions: {
    async fetchItems() {
      // 비동기 액션
    }
  }
})
```

### 컴포넌트 통신 패턴
```javascript
// Props & Emits
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

// Provide/Inject
provide('key', value)
const value = inject('key')

// Event Bus (지양)
// Pinia Store 사용 권장
```