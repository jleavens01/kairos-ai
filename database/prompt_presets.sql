-- 프롬프트 프리셋 테이블 생성
CREATE TABLE IF NOT EXISTS prompt_presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    preset_type VARCHAR(50) DEFAULT 'general', -- general, style, quality, camera, lighting
    media_type VARCHAR(50) DEFAULT 'image', -- image, video, both
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_prompt_presets_project ON prompt_presets(project_id);
CREATE INDEX idx_prompt_presets_type ON prompt_presets(preset_type);
CREATE INDEX idx_prompt_presets_media ON prompt_presets(media_type);

-- RLS 정책
ALTER TABLE prompt_presets ENABLE ROW LEVEL SECURITY;

-- 프로젝트 소유자만 CRUD 가능
CREATE POLICY prompt_presets_policy ON prompt_presets
    FOR ALL
    USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- 샘플 프리셋 데이터 (선택사항)
-- INSERT INTO prompt_presets (project_id, name, prompt, preset_type, media_type) VALUES
-- ('{your-project-id}', '시네마틱 스타일', 'cinematic style, dramatic lighting, film grain, anamorphic lens', 'style', 'both'),
-- ('{your-project-id}', '고품질', 'ultra high quality, 8k resolution, highly detailed, professional', 'quality', 'both'),
-- ('{your-project-id}', '클로즈업 샷', 'close-up shot, shallow depth of field, bokeh background', 'camera', 'both'),
-- ('{your-project-id}', '자연광', 'natural lighting, golden hour, soft shadows, warm tones', 'lighting', 'both');