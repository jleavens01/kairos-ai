# 데이터베이스 스키마 문서

## gen_images 테이블
이미지 생성 관련 데이터 저장

### 주요 컬럼
- `id`: UUID (PK)
- `project_id`: UUID (프로젝트 참조)
- `production_sheet_id`: UUID (스토리보드 씬 참조) ⭐
- `image_type`: 이미지 유형 (scene, character, prop 등)
- `generation_status`: 생성 상태 (pending, processing, completed, failed)
- `storage_image_url`: Supabase Storage URL
- `thumbnail_url`: 썸네일 URL
- `tags`: 태그 배열
- `metadata`: JSONB (추가 메타데이터)

## gen_videos 테이블
비디오 생성 관련 데이터 저장

### 주요 컬럼
- `id`: UUID (PK)
- `project_id`: UUID (프로젝트 참조)
- `production_sheet_id`: UUID (스토리보드 씬 참조) ⭐
- `linked_scene_id`: UUID (별도 씬 연결용 - 선택적)
- `linked_scene_number`: INTEGER (씬 번호)
- `video_type`: 비디오 유형 (scene, action 등)
- `generation_status`: 생성 상태
- `storage_video_url`: Supabase Storage URL
- `thumbnail_url`: 썸네일 URL
- `duration_seconds`: 비디오 길이 (초)
- `resolution`: 해상도
- `metadata`: JSONB

## production_sheets 테이블
스토리보드/프로덕션 시트 데이터

### 주요 컬럼
- `id`: UUID (PK)
- `project_id`: UUID (프로젝트 참조)
- `scene_number`: INTEGER (씬 번호)
- `scene_image_url`: TEXT (씬에 연결된 이미지 URL)
- `scene_video_url`: TEXT (씬에 연결된 비디오 URL)
- `scene_media_type`: VARCHAR(10) (image/video)
- `original_script_text`: TEXT (원본 스크립트)
- `characters`: TEXT[] (등장인물 배열)

## 관계
- `gen_images.production_sheet_id` → `production_sheets.id`
- `gen_videos.production_sheet_id` → `production_sheets.id`
- 이미지/비디오를 스토리보드 씬에 연결할 때 `production_sheet_id` 사용

## 주의사항
- ❌ 새로운 컬럼 추가 금지 (혼란 방지)
- ✅ 기존 컬럼 활용
- ✅ 일관성 있는 네이밍 사용
- ✅ production_sheet_id로 씬 연결 통일