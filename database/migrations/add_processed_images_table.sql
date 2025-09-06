-- 처리된 이미지 테이블 생성 (배경 제거, 기타 편집 작업)
CREATE TABLE IF NOT EXISTS gen_processed_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_image_id UUID REFERENCES gen_images(id) ON DELETE SET NULL,
    original_image_url TEXT NOT NULL,
    processed_image_url TEXT NOT NULL,
    process_type VARCHAR(50) NOT NULL, -- remove_background, enhance, restore, etc.
    model VARCHAR(50) DEFAULT 'recraft-background-removal',
    mode VARCHAR(30) DEFAULT 'auto', -- auto, object, person, etc.
    status VARCHAR(20) DEFAULT 'completed', -- processing, completed, failed
    file_size BIGINT, -- 처리된 파일 크기 (bytes)
    
    -- 백업 관련 필드
    backup_status VARCHAR(20), -- pending, completed, failed
    backup_storage_url TEXT,
    backup_storage_path TEXT,
    backed_up_at TIMESTAMPTZ,
    backup_file_size BIGINT,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    credit_cost INTEGER DEFAULT 40,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- soft delete
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_gen_processed_images_user_id ON gen_processed_images(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_processed_images_original_id ON gen_processed_images(original_image_id);
CREATE INDEX IF NOT EXISTS idx_gen_processed_images_process_type ON gen_processed_images(process_type);
CREATE INDEX IF NOT EXISTS idx_gen_processed_images_status ON gen_processed_images(status);
CREATE INDEX IF NOT EXISTS idx_gen_processed_images_backup_status ON gen_processed_images(backup_status);
CREATE INDEX IF NOT EXISTS idx_gen_processed_images_created_at ON gen_processed_images(created_at DESC);

-- RLS 정책 활성화
ALTER TABLE gen_processed_images ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 처리된 이미지만 관리 가능
CREATE POLICY "Users can view own processed images" ON gen_processed_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processed images" ON gen_processed_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processed images" ON gen_processed_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own processed images" ON gen_processed_images
    FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_gen_processed_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_gen_processed_images_updated_at
    BEFORE UPDATE ON gen_processed_images
    FOR EACH ROW
    EXECUTE FUNCTION update_gen_processed_images_updated_at();

-- 처리된 이미지 통계 뷰
CREATE OR REPLACE VIEW gen_processed_images_summary AS
SELECT 
    gpi.user_id,
    gpi.process_type,
    COUNT(*) as total_processed,
    COUNT(CASE WHEN gpi.status = 'completed' THEN 1 END) as completed_processed,
    COUNT(CASE WHEN gpi.backup_status = 'completed' THEN 1 END) as backed_up_processed,
    SUM(gpi.credit_cost) as total_credit_cost,
    SUM(gpi.file_size) as total_file_size,
    MAX(gpi.created_at) as last_processed
FROM gen_processed_images gpi
WHERE gpi.deleted_at IS NULL
GROUP BY gpi.user_id, gpi.process_type;

-- 전체 처리 통계 뷰
CREATE OR REPLACE VIEW gen_processed_images_overall_summary AS
SELECT 
    gpi.user_id,
    COUNT(*) as total_processed,
    COUNT(CASE WHEN gpi.process_type = 'remove_background' THEN 1 END) as background_removed,
    COUNT(CASE WHEN gpi.process_type = 'enhance' THEN 1 END) as enhanced,
    COUNT(CASE WHEN gpi.process_type = 'restore' THEN 1 END) as restored,
    COUNT(CASE WHEN gpi.backup_status = 'completed' THEN 1 END) as backed_up_processed,
    SUM(gpi.credit_cost) as total_credit_cost,
    SUM(gpi.file_size) as total_file_size,
    MAX(gpi.created_at) as last_processed
FROM gen_processed_images gpi
WHERE gpi.deleted_at IS NULL
GROUP BY gpi.user_id;

-- 백업 필요한 처리된 이미지 뷰
CREATE OR REPLACE VIEW processed_images_needing_backup AS
SELECT 
    gpi.*
FROM gen_processed_images gpi
WHERE gpi.status = 'completed'
  AND gpi.backup_status IS NULL
  AND gpi.processed_image_url IS NOT NULL
  AND gpi.deleted_at IS NULL
ORDER BY gpi.created_at DESC;

-- 댓글 추가
COMMENT ON TABLE gen_processed_images IS '배경 제거, 이미지 향상 등 처리된 이미지 저장 테이블';
COMMENT ON COLUMN gen_processed_images.process_type IS '처리 유형 (remove_background, enhance, restore 등)';
COMMENT ON COLUMN gen_processed_images.mode IS '처리 모드 (auto, object, person 등)';
COMMENT ON COLUMN gen_processed_images.original_image_id IS '원본 이미지 테이블 참조 (gen_images)';
COMMENT ON COLUMN gen_processed_images.backup_status IS '백업 상태 추적';
COMMENT ON COLUMN gen_processed_images.credit_cost IS '처리에 사용된 크레딧 비용';