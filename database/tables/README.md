# AI Content Production 데이터베이스 테이블

## 실행 순서

Supabase SQL Editor에서 다음 순서대로 실행하세요:

### 1단계: 기본 함수 설정
```sql
-- 0_setup_functions.sql 실행
-- updated_at 자동 업데이트 함수 생성
```

### 2단계: 핵심 테이블 생성
```sql
-- 1_content_items.sql 실행
-- 뉴스 수집 및 콘텐츠 아이템 저장
```

```sql
-- 2_agent_tasks.sql 실행
-- AI 에이전트 작업 관리
```

```sql
-- 3_content_research.sql 실행
-- 연구 데이터 저장
```

```sql
-- 4_content_scripts.sql 실행
-- 원고 데이터 저장
```

```sql
-- 5_content_storyboards.sql 실행
-- 스토리보드 데이터 저장
```

```sql
-- 6_channel_profiles.sql 실행
-- 채널 프로필 관리
```

## 테이블 관계도

```
content_items (뉴스/콘텐츠 아이템)
    ├── agent_tasks (에이전트 작업들)
    ├── content_research (연구 데이터)
    ├── content_scripts (원고)
    └── content_storyboards (스토리보드)
            └── projects (기존 시스템 연결)
                    └── production_sheets (기존 시스템)
```

## 주요 테이블 설명

### content_items
- **용도**: 뉴스 수집된 아이템 및 콘텐츠 후보 관리
- **주요 필드**: 
  - `title`: 제목
  - `score`: 적합성 점수
  - `workflow_stage`: 현재 제작 단계
  - `metadata`: 추가 정보 (키워드, 평가 이유 등)

### agent_tasks
- **용도**: AI 에이전트들의 작업 큐 관리
- **주요 필드**:
  - `agent_type`: 에이전트 종류 (researcher, writer 등)
  - `task_type`: 작업 유형
  - `priority`: 우선순위 (0-100)
  - `status`: pending → in_progress → completed

### content_research
- **용도**: 연구 에이전트가 수집한 자료
- **주요 필드**:
  - `research_data`: 전체 연구 결과
  - `facts`: 핵심 사실들
  - `visual_ideas`: 시각화 아이디어

### content_scripts
- **용도**: 작성된 원고 저장
- **주요 필드**:
  - `script_data`: 전체 원고 구조
  - `scenes`: 씬별 원고
  - `keywords`: SEO 키워드

### content_storyboards
- **용도**: 스토리보드 데이터
- **주요 필드**:
  - `project_id`: 기존 projects 테이블과 연결
  - `storyboard_data`: 전체 스토리보드
  - `visual_style`: 비주얼 스타일

### channel_profiles
- **용도**: 채널별 프로필 저장 (세상의모든지식 등)
- **주요 필드**:
  - `channel_id`: 채널 식별자
  - `profile_data`: 채널 DNA (톤앤매너, 타겟 등)
  - `customizations`: 사용자 커스터마이징

## RLS (Row Level Security)

모든 테이블에 RLS가 활성화되어 있으며, 현재는 서비스 역할(Service Role)만 접근 가능합니다.

필요시 다음과 같은 정책을 추가할 수 있습니다:

```sql
-- 예: 인증된 사용자가 자신의 콘텐츠만 조회
CREATE POLICY "Users can view own content" ON content_items
    FOR SELECT
    USING (auth.uid()::text = metadata->>'user_id');
```

## 인덱스

각 테이블에는 성능 최적화를 위한 인덱스가 포함되어 있습니다:
- status 필드: 상태별 필터링
- created_at DESC: 최신순 정렬
- foreign key 필드: 조인 성능

## 트리거

모든 테이블의 `updated_at` 필드는 자동으로 업데이트됩니다.