# Database Migrations

## 업스케일 기능을 위한 마이그레이션 (필수)

Supabase SQL Editor에서 다음 SQL을 실행해주세요:

```sql
-- gen_videos 테이블에 업스케일 관련 필드 추가
ALTER TABLE gen_videos 
ADD COLUMN IF NOT EXISTS is_upscaled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_video_id UUID REFERENCES gen_videos(id),
ADD COLUMN IF NOT EXISTS upscale_factor FLOAT,
ADD COLUMN IF NOT EXISTS upscale_target_fps INTEGER,
ADD COLUMN IF NOT EXISTS upscale_settings JSONB;

-- 업스케일된 비디오를 찾기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_gen_videos_original_video_id 
ON gen_videos(original_video_id) 
WHERE original_video_id IS NOT NULL;

-- 업스케일 상태를 추적하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_gen_videos_is_upscaled 
ON gen_videos(is_upscaled) 
WHERE is_upscaled = true;

-- 코멘트 추가
COMMENT ON COLUMN gen_videos.is_upscaled IS '업스케일된 비디오인지 여부';
COMMENT ON COLUMN gen_videos.original_video_id IS '원본 비디오 ID (업스케일된 경우)';
COMMENT ON COLUMN gen_videos.upscale_factor IS '업스케일 배수 (2x, 4x 등)';
COMMENT ON COLUMN gen_videos.upscale_target_fps IS '목표 FPS (프레임 보간 사용 시)';
COMMENT ON COLUMN gen_videos.upscale_settings IS '업스케일 설정 (모델, 파라미터 등)';
```

## 실행 방법

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. SQL Editor 탭으로 이동
4. 위의 SQL 코드를 복사하여 붙여넣기
5. "Run" 버튼 클릭

## 확인 방법

다음 쿼리로 컬럼이 추가되었는지 확인:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gen_videos'
AND column_name IN ('is_upscaled', 'original_video_id', 'upscale_factor', 'upscale_target_fps', 'upscale_settings')
ORDER BY column_name;
```