-- HeyGen 아바타 비디오 테이블 생성
-- 기존 gen_videos 테이블과 유사하지만 HeyGen 전용 필드 추가

CREATE TABLE IF NOT EXISTS gen_heygen_videos (
    -- 기본 필드
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- HeyGen 관련 필드
    heygen_video_id VARCHAR(255) UNIQUE NOT NULL,  -- HeyGen API에서 받은 video_id
    callback_id VARCHAR(255),                      -- 콜백 식별자
    
    -- 아바타 설정
    avatar_id VARCHAR(255) NOT NULL,               -- 사용된 아바타 ID (예: Daisy-inskirt-20220818)
    avatar_style VARCHAR(50) DEFAULT 'normal',     -- 아바타 스타일
    avatar_scale DECIMAL(3,2) DEFAULT 1.0,         -- 아바타 크기
    
    -- 음성 설정
    voice_id VARCHAR(255) NOT NULL,                -- 사용된 음성 ID
    voice_type VARCHAR(20) DEFAULT 'text',         -- 음성 타입 (text, audio, silence)
    input_text TEXT,                               -- 입력 텍스트 (voice_type이 text인 경우)
    voice_speed DECIMAL(3,2) DEFAULT 1.0,          -- 음성 속도
    voice_pitch INTEGER DEFAULT 0,                 -- 음성 피치
    voice_emotion VARCHAR(50),                     -- 음성 감정 (지원하는 경우)
    voice_locale VARCHAR(10),                      -- 음성 로케일
    
    -- 비디오 설정
    title VARCHAR(255),                            -- 비디오 제목
    dimension_width INTEGER DEFAULT 1280,         -- 비디오 너비
    dimension_height INTEGER DEFAULT 720,         -- 비디오 높이
    has_caption BOOLEAN DEFAULT false,             -- 자막 포함 여부
    
    -- 배경 설정
    background_type VARCHAR(20) DEFAULT 'color',   -- 배경 타입 (color, image)
    background_value TEXT DEFAULT '#f6f6fc',      -- 배경 값 (색상 코드 또는 이미지 URL)
    
    -- 상태 및 결과
    status VARCHAR(20) DEFAULT 'processing',       -- processing, completed, failed
    progress INTEGER DEFAULT 0,                   -- 생성 진행률 (0-100)
    error_message TEXT,                           -- 오류 메시지 (실패 시)
    
    -- HeyGen 응답 URLs
    video_url TEXT,                               -- 생성된 비디오 URL
    thumbnail_url TEXT,                           -- 썸네일 이미지 URL
    gif_url TEXT,                                 -- GIF 미리보기 URL
    caption_url TEXT,                            -- 자막 파일 URL (있는 경우)
    
    -- 파일 정보
    duration DECIMAL(6,3),                        -- 비디오 길이 (초)
    file_size BIGINT,                            -- 파일 크기 (bytes)
    
    -- 백업 정보 (기존 백업 시스템과 호환)
    backup_storage_url TEXT,                      -- 백업된 Supabase Storage URL
    backup_storage_path TEXT,                     -- 백업된 파일 경로
    backed_up_at TIMESTAMPTZ,                     -- 백업 완료 시간
    backup_status VARCHAR(20),                    -- pending, completed, failed
    backup_file_size BIGINT,                      -- 백업된 파일 크기
    
    -- 메타데이터
    generation_params JSONB,                      -- 생성 요청 전체 파라미터 저장
    heygen_response JSONB,                        -- HeyGen API 응답 전체 저장
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,                     -- 생성 완료 시간
    
    -- 제약조건
    CONSTRAINT valid_status CHECK (status IN ('processing', 'completed', 'failed')),
    CONSTRAINT valid_backup_status CHECK (backup_status IN ('pending', 'completed', 'failed')),
    CONSTRAINT valid_voice_type CHECK (voice_type IN ('text', 'audio', 'silence')),
    CONSTRAINT valid_background_type CHECK (background_type IN ('color', 'image')),
    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_gen_heygen_videos_user_id ON gen_heygen_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_heygen_videos_heygen_video_id ON gen_heygen_videos(heygen_video_id);
CREATE INDEX IF NOT EXISTS idx_gen_heygen_videos_status ON gen_heygen_videos(status);
CREATE INDEX IF NOT EXISTS idx_gen_heygen_videos_created_at ON gen_heygen_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_heygen_videos_backup_status ON gen_heygen_videos(backup_status);

-- 업데이트 트리거 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_gen_heygen_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gen_heygen_videos_updated_at
    BEFORE UPDATE ON gen_heygen_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_gen_heygen_videos_updated_at();

-- RLS 정책 설정
ALTER TABLE gen_heygen_videos ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 HeyGen 비디오만 접근 가능
CREATE POLICY "Users can view their own HeyGen videos" ON gen_heygen_videos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own HeyGen videos" ON gen_heygen_videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own HeyGen videos" ON gen_heygen_videos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own HeyGen videos" ON gen_heygen_videos
    FOR DELETE USING (auth.uid() = user_id);

-- 백업 상태 요약 뷰 (기존 백업 모니터링 시스템과 호환)
CREATE OR REPLACE VIEW heygen_backup_status_summary AS
SELECT 
    COUNT(*) as total_videos,
    COUNT(*) FILTER (WHERE backup_status = 'completed') as backed_up,
    COUNT(*) FILTER (WHERE backup_status = 'failed') as failed,
    COUNT(*) FILTER (WHERE backup_status IS NULL OR backup_status = 'pending') as pending,
    COALESCE(SUM(file_size), 0) as total_size_bytes,
    COALESCE(SUM(file_size) FILTER (WHERE backup_status = 'completed'), 0) as backed_up_size_bytes,
    ROUND(AVG(duration), 2) as avg_duration_seconds,
    COUNT(DISTINCT user_id) as unique_users
FROM gen_heygen_videos
WHERE status = 'completed' AND video_url IS NOT NULL;

-- 코멘트 추가
COMMENT ON TABLE gen_heygen_videos IS 'HeyGen 아바타 비디오 생성 기록 및 메타데이터';
COMMENT ON COLUMN gen_heygen_videos.heygen_video_id IS 'HeyGen API에서 반환하는 고유 비디오 ID';
COMMENT ON COLUMN gen_heygen_videos.generation_params IS '비디오 생성 시 사용된 전체 파라미터 (JSON)';
COMMENT ON COLUMN gen_heygen_videos.heygen_response IS 'HeyGen API 응답 전체 데이터 (JSON)';
COMMENT ON COLUMN gen_heygen_videos.backup_storage_url IS '백업 시스템(Supabase Storage)에 저장된 파일 URL';