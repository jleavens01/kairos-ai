-- gen_videos 테이블에 모델별 파라미터 컬럼 추가
-- 각 모델의 파라미터를 체계적으로 저장하기 위한 스키마 업데이트

-- 1. 공통 파라미터 컬럼들 (이미 존재하는 것들 포함)
-- prompt_used: 실제 사용된 프롬프트 (이미 존재)
-- custom_prompt: 사용자 입력 프롬프트 (이미 존재)
-- reference_image_url: 참조 이미지 URL (이미 존재)
-- duration_seconds: 비디오 길이 (이미 존재)
-- fps: 프레임레이트 (이미 존재)
-- resolution: 해상도 (이미 존재)

-- 2. Google Veo 모델 전용 파라미터
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS negative_prompt text NULL;

ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS aspect_ratio character varying(20) NULL;

ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS person_generation character varying(50) NULL;

-- 3. Kling 모델 전용 파라미터
-- cfg_scale은 JSONB metadata나 model_parameters에 저장
-- negative_prompt는 이미 추가됨 (Google Veo와 공유)

-- 4. Hailou 모델 전용 파라미터
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS prompt_optimizer boolean NULL DEFAULT true;

-- 5. 모델 파라미터 버전 관리 (향후 파라미터 변경 추적용)
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS model_version character varying(50) NULL;

-- 6. 실제 API 요청/응답 정보 저장
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS api_request jsonb NULL;

ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS api_response jsonb NULL;

-- 7. 비용 정보
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS credits_used integer NULL;

-- 8. 비디오 URL 필드 추가 (누락된 경우)
ALTER TABLE public.gen_videos 
ADD COLUMN IF NOT EXISTS video_url text NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_gen_videos_aspect_ratio 
ON public.gen_videos USING btree (aspect_ratio) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_gen_videos_model_version 
ON public.gen_videos USING btree (model_version) 
TABLESPACE pg_default;

-- 코멘트 추가
COMMENT ON COLUMN public.gen_videos.negative_prompt IS 'Google Veo 및 Kling 모델용 네거티브 프롬프트';
COMMENT ON COLUMN public.gen_videos.aspect_ratio IS '화면 비율 (16:9, 9:16, 1:1 등)';
COMMENT ON COLUMN public.gen_videos.person_generation IS 'Google Veo 사람 생성 제어 (allow_adult, dont_allow)';
COMMENT ON COLUMN public.gen_videos.prompt_optimizer IS 'Hailou 프롬프트 최적화 사용 여부';
COMMENT ON COLUMN public.gen_videos.model_version IS '모델 버전 정보 (veo-2.0, kling-2.1, hailou-02-standard 등)';
COMMENT ON COLUMN public.gen_videos.api_request IS 'API 요청 전체 내용 (디버깅용)';
COMMENT ON COLUMN public.gen_videos.api_response IS 'API 응답 전체 내용 (디버깅용)';
COMMENT ON COLUMN public.gen_videos.credits_used IS '사용된 크레딧 수';
COMMENT ON COLUMN public.gen_videos.video_url IS 'API에서 반환된 원본 비디오 URL';

-- 불필요한 컬럼 제거 (이미 존재하는 경우)
-- camera_movement와 mode 컬럼이 이미 존재한다면 제거
-- 주의: 실제 운영 환경에서는 데이터 백업 후 실행
-- ALTER TABLE public.gen_videos DROP COLUMN IF EXISTS camera_movement;
-- ALTER TABLE public.gen_videos DROP COLUMN IF EXISTS mode;