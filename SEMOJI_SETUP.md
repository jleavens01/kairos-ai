# 세모지 학습 데이터 시스템 설정 가이드

## 1. 데이터베이스 테이블 생성

Supabase SQL Editor에서 다음 파일의 내용을 실행하세요:

```bash
database/tables/semoji_training_data.sql
```

### 수동 실행 방법:
1. Supabase Dashboard 접속
2. SQL Editor 메뉴 클릭
3. `database/tables/semoji_training_data.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. "Run" 버튼 클릭

## 2. 원고 업로드 방법

### 개별 업로드
1. `/production` 페이지 접속
2. "세모지 학습 데이터" 탭 클릭
3. "원고 업로드" 버튼 클릭
4. 필수 정보 입력:
   - 제목
   - 전체 원고

### 대량 업로드
1. 텍스트 파일 준비 (.txt 또는 .md)
2. 파일 형식:
```markdown
# [제목]
## [부제목]
YouTube: [YouTube URL]

[원고 내용]
```

3. 파일을 드래그&드롭 영역에 놓기

## 3. 파인튜닝 데이터 생성

1. 원고 50개 이상 업로드
2. "파인튜닝 데이터 생성" 버튼 클릭
3. 형식 선택:
   - OpenAI (GPT-3.5/4)
   - Gemini 2.5
   - Llama 3
4. JSONL 파일 다운로드

## 4. 오류 해결

### "테이블을 찾을 수 없음" 오류
- 원인: `semoji_training_data` 테이블이 생성되지 않음
- 해결: 위의 "1. 데이터베이스 테이블 생성" 단계 수행

### Badge variant 경고
- 이미 수정됨 (info → secondary)

## 5. 테스트 원고 예시

```text
스타벅스는 어떻게 세계 최고의 카페가 되었을까?

여러분은 스타벅스에서 커피를 사신 적 있으신가요? 
그런데 하워드 슐츠는 커피를 팔려고 한 게 아니었습니다. 
그가 정말로 팔고 싶었던 것은 '제3의 공간'이었죠.

1971년, 시애틀의 파이크 플레이스 마켓...
```