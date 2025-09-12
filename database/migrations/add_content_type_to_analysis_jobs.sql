-- script_analysis_jobs 테이블에 content_type 컬럼 추가
-- 콘텐츠 장르 정보를 저장하여 분석 시 참고

ALTER TABLE script_analysis_jobs 
ADD COLUMN content_type TEXT DEFAULT '다큐멘터리';

-- 기존 작업들에 기본값 설정
UPDATE script_analysis_jobs 
SET content_type = '다큐멘터리' 
WHERE content_type IS NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN script_analysis_jobs.content_type IS '콘텐츠 장르 (다큐멘터리, 드라마, 영화, 애니메이션, 프리젠테이션)';