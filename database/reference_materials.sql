-- Reference Materials 테이블 생성
-- Wikipedia API 및 외부 이미지 검색을 통해 수집된 레퍼런스 자료 관리

CREATE TABLE reference_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 자료 기본 정보
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general', -- 'character', 'location', 'object', 'general'
    
    -- 소스 정보
    source_type VARCHAR(20) NOT NULL, -- 'wikipedia', 'external_image', 'user_upload'
    source_url TEXT, -- 원본 URL
    source_id VARCHAR(100), -- Wikipedia page ID 등
    
    -- 미디어 정보
    media_type VARCHAR(10) DEFAULT 'image', -- 'image', 'text'
    image_url TEXT,
    thumbnail_url TEXT,
    
    -- 메타데이터
    tags TEXT[], -- 태그 배열
    wikipedia_extract TEXT, -- Wikipedia 요약 텍스트 (있는 경우)
    metadata JSONB DEFAULT '{}', -- 추가 메타데이터
    
    -- 사용자 설정
    is_favorite BOOLEAN DEFAULT false,
    notes TEXT, -- 사용자 메모
    
    -- 시스템 필드
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX idx_reference_materials_project_id ON reference_materials(project_id);
CREATE INDEX idx_reference_materials_user_id ON reference_materials(user_id);
CREATE INDEX idx_reference_materials_category ON reference_materials(category);
CREATE INDEX idx_reference_materials_source_type ON reference_materials(source_type);
CREATE INDEX idx_reference_materials_created_at ON reference_materials(created_at DESC);
CREATE INDEX idx_reference_materials_tags ON reference_materials USING gin(tags);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_reference_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reference_materials_updated_at_trigger
    BEFORE UPDATE ON reference_materials
    FOR EACH ROW
    EXECUTE PROCEDURE update_reference_materials_updated_at();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE reference_materials ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 자료만 조회 가능
CREATE POLICY reference_materials_select_policy 
ON reference_materials 
FOR SELECT 
USING (user_id = auth.uid());

-- 사용자는 자신의 자료만 생성 가능
CREATE POLICY reference_materials_insert_policy 
ON reference_materials 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 사용자는 자신의 자료만 수정 가능
CREATE POLICY reference_materials_update_policy 
ON reference_materials 
FOR UPDATE 
USING (user_id = auth.uid());

-- 사용자는 자신의 자료만 삭제 가능
CREATE POLICY reference_materials_delete_policy 
ON reference_materials 
FOR DELETE 
USING (user_id = auth.uid());