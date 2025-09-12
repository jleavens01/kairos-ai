# gen-images Storage 버킷 정책 설정 가이드

## ⚠️ 중요: Storage 정책은 Supabase Dashboard에서만 설정 가능합니다!

SQL로는 Storage 정책을 설정할 수 없습니다. 다음 단계를 따라주세요:

## 설정 방법

### 1. Supabase Dashboard 접속
1. https://app.supabase.com 로그인
2. 프로젝트 선택

### 2. Storage 정책 설정
1. 왼쪽 메뉴에서 **Storage** 클릭
2. **Policies** 탭 클릭
3. **gen-images** 버킷 선택

### 3. 정책 추가

#### 옵션 A: 간단한 공개 설정 (개발용)
1. **Make bucket public** 토글 활성화
   - 모든 사용자가 읽기/쓰기 가능
   - 개발 중에만 사용 권장

#### 옵션 B: 세밀한 정책 설정 (프로덕션용)
각 작업별로 **New Policy** 버튼 클릭하여 추가:

**SELECT (조회) 정책:**
- Policy name: `Allow public read`
- Allowed operation: SELECT
- Target roles: anon, authenticated
- Policy definition:
  ```
  true
  ```

**INSERT (업로드) 정책:**
- Policy name: `Allow authenticated upload`
- Allowed operation: INSERT
- Target roles: authenticated
- Policy definition:
  ```
  true
  ```

**UPDATE (수정) 정책:**
- Policy name: `Allow authenticated update`
- Allowed operation: UPDATE
- Target roles: authenticated
- Policy definition:
  ```
  true
  ```

**DELETE (삭제) 정책:**
- Policy name: `Allow authenticated delete`
- Allowed operation: DELETE
- Target roles: authenticated
- Policy definition:
  ```
  true
  ```

### 4. 정책 템플릿 사용 (권장)
Dashboard에서 제공하는 템플릿 사용:
1. **Use a template** 클릭
2. **Give users access to own folder** 선택
3. Path pattern: `{user_id}/*` 또는 `{project_id}/*`
4. 각 작업(SELECT, INSERT, UPDATE, DELETE)에 대해 설정

## 문제 해결

### 403 Forbidden 오류가 계속 발생하는 경우:
1. 버킷이 Public으로 설정되어 있는지 확인
2. 정책이 올바르게 저장되었는지 확인
3. 브라우저 캐시 삭제 후 재시도
4. Supabase 대시보드에서 정책 새로고침

### 테스트 방법:
1. 개발자 도구 > Network 탭 열기
2. 이미지 업로드 시도
3. 403 오류 확인
4. Response Headers에서 정책 관련 메시지 확인

## 주의사항
- Storage 정책은 RLS(Row Level Security)와 별개입니다
- 버킷별로 정책을 설정해야 합니다
- 정책 변경 후 즉시 적용됩니다