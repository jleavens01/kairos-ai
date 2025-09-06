-- 업스케일된 이미지 테이블 생성
CREATE TABLE IF NOT EXISTS gen_upscaled_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_image_id UUID REFERENCES gen_images(id) ON DELETE SET NULL,
    original_image_url TEXT NOT NULL,
    upscaled_image_url TEXT NOT NULL,
    upscale_factor INTEGER NOT NULL DEFAULT 4, -- 2x, 4x, 8x
    model VARCHAR(50) DEFAULT 'recraft-upscale',
    status VARCHAR(20) DEFAULT 'completed', -- processing, completed, failed
    file_size BIGINT, -- 업스케일된 파일 크기 (bytes)
    
    -- 백업 관련 필드
    backup_status VARCHAR(20), -- pending, completed, failed
    backup_storage_url TEXT,
    backup_storage_path TEXT,
    backed_up_at TIMESTAMPTZ,
    backup_file_size BIGINT,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    credit_cost INTEGER DEFAULT 60,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- soft delete
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_gen_upscaled_images_user_id ON gen_upscaled_images(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_upscaled_images_original_id ON gen_upscaled_images(original_image_id);
CREATE INDEX IF NOT EXISTS idx_gen_upscaled_images_status ON gen_upscaled_images(status);
CREATE INDEX IF NOT EXISTS idx_gen_upscaled_images_backup_status ON gen_upscaled_images(backup_status);
CREATE INDEX IF NOT EXISTS idx_gen_upscaled_images_created_at ON gen_upscaled_images(created_at DESC);

-- RLS 정책 활성화
ALTER TABLE gen_upscaled_images ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 업스케일 이미지만 관리 가능
CREATE POLICY "Users can view own upscaled images" ON gen_upscaled_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upscaled images" ON gen_upscaled_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upscaled images" ON gen_upscaled_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own upscaled images" ON gen_upscaled_images
    FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_gen_upscaled_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_gen_upscaled_images_updated_at
    BEFORE UPDATE ON gen_upscaled_images
    FOR EACH ROW
    EXECUTE FUNCTION update_gen_upscaled_images_updated_at();

-- 업스케일 통계 뷰
CREATE OR REPLACE VIEW gen_upscaled_images_summary AS
SELECT 
    gui.user_id,
    COUNT(*) as total_upscaled,
    COUNT(CASE WHEN gui.status = 'completed' THEN 1 END) as completed_upscaled,
    COUNT(CASE WHEN gui.backup_status = 'completed' THEN 1 END) as backed_up_upscaled,
    AVG(gui.upscale_factor) as avg_upscale_factor,
    SUM(gui.credit_cost) as total_credit_cost,
    SUM(gui.file_size) as total_file_size,
    MAX(gui.created_at) as last_upscaled
FROM gen_upscaled_images gui
WHERE gui.deleted_at IS NULL
GROUP BY gui.user_id;

-- 백업 필요한 업스케일 이미지 뷰
CREATE OR REPLACE VIEW upscaled_images_needing_backup AS
SELECT 
    gui.*
FROM gen_upscaled_images gui
WHERE gui.status = 'completed'
  AND gui.backup_status IS NULL
  AND gui.upscaled_image_url IS NOT NULL
  AND gui.deleted_at IS NULL
ORDER BY gui.created_at DESC;

-- 댓글 추가
COMMENT ON TABLE gen_upscaled_images IS '업스케일된 이미지 저장 테이블';
COMMENT ON COLUMN gen_upscaled_images.upscale_factor IS '업스케일 배수 (2, 4, 8)';
COMMENT ON COLUMN gen_upscaled_images.original_image_id IS '원본 이미지 테이블 참조 (gen_images)';
COMMENT ON COLUMN gen_upscaled_images.backup_status IS '백업 상태 추적';
COMMENT ON COLUMN gen_upscaled_images.credit_cost IS '업스케일에 사용된 크레딧 비용';