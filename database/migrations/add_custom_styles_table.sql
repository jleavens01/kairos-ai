-- 커스텀 스타일 테이블 생성
CREATE TABLE IF NOT EXISTS custom_styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    style_id VARCHAR(255) UNIQUE NOT NULL, -- Recraft에서 반환한 style_id
    style_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_count INTEGER NOT NULL DEFAULT 1,
    image_urls TEXT[] NOT NULL, -- 업로드한 이미지 URLs 배열
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, deleted
    usage_count INTEGER DEFAULT 0, -- 스타일 사용 횟수
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- soft delete
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_custom_styles_user_id ON custom_styles(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_styles_style_id ON custom_styles(style_id);
CREATE INDEX IF NOT EXISTS idx_custom_styles_status ON custom_styles(status);
CREATE INDEX IF NOT EXISTS idx_custom_styles_created_at ON custom_styles(created_at DESC);

-- RLS 정책 활성화
ALTER TABLE custom_styles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 스타일만 관리 가능
CREATE POLICY "Users can view own styles" ON custom_styles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own styles" ON custom_styles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own styles" ON custom_styles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own styles" ON custom_styles
    FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_custom_styles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_custom_styles_updated_at
    BEFORE UPDATE ON custom_styles
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_styles_updated_at();

-- 스타일 사용 통계 뷰
CREATE OR REPLACE VIEW custom_styles_summary AS
SELECT 
    cs.user_id,
    COUNT(*) as total_styles,
    COUNT(CASE WHEN cs.status = 'active' THEN 1 END) as active_styles,
    SUM(cs.usage_count) as total_usage_count,
    AVG(cs.image_count) as avg_images_per_style,
    MAX(cs.created_at) as last_style_created
FROM custom_styles cs
WHERE cs.deleted_at IS NULL
GROUP BY cs.user_id;

-- 댓글 추가
COMMENT ON TABLE custom_styles IS 'Recraft 커스텀 스타일 저장 테이블';
COMMENT ON COLUMN custom_styles.style_id IS 'Recraft API에서 반환한 고유 스타일 ID';
COMMENT ON COLUMN custom_styles.image_urls IS '스타일 생성에 사용된 이미지 URL 배열 (최대 5개)';
COMMENT ON COLUMN custom_styles.usage_count IS '이 스타일이 이미지 생성에 사용된 횟수';