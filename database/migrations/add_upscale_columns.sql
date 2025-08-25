-- 업스케일 관련 컬럼을 gen_videos 테이블에 추가
-- 2025-01-XX

-- 업스케일 관련 컬럼 추가
ALTER TABLE gen_videos 
ADD COLUMN IF NOT EXISTS upscale_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS upscale_factor VARCHAR(50), -- 2x, 4x 등
ADD COLUMN IF NOT EXISTS upscale_target_fps INTEGER, -- 30, 60 등
ADD COLUMN IF NOT EXISTS upscale_settings JSONB DEFAULT '{}', -- codec, quality 등 설정
ADD COLUMN IF NOT EXISTS upscale_video_url TEXT,
ADD COLUMN IF NOT EXISTS upscale_status VARCHAR(50), -- processing, completed, failed
ADD COLUMN IF NOT EXISTS upscaled_at TIMESTAMPTZ;

-- 인덱스 추가 (업스케일된 비디오 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_gen_videos_upscale_status ON gen_videos(upscale_status);
CREATE INDEX IF NOT EXISTS idx_gen_videos_upscaled_at ON gen_videos(upscaled_at);

-- 코멘트 추가
COMMENT ON COLUMN gen_videos.upscale_id IS '업스케일 작업 ID';
COMMENT ON COLUMN gen_videos.upscale_factor IS '업스케일 배율 (2x, 4x 등)';
COMMENT ON COLUMN gen_videos.upscale_target_fps IS '목표 FPS';
COMMENT ON COLUMN gen_videos.upscale_settings IS '업스케일 설정 (codec, quality 등)';
COMMENT ON COLUMN gen_videos.upscale_video_url IS '업스케일된 비디오 URL';
COMMENT ON COLUMN gen_videos.upscale_status IS '업스케일 상태';
COMMENT ON COLUMN gen_videos.upscaled_at IS '업스케일 완료 시간';