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