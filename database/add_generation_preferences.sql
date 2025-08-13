-- projects 테이블에 마지막 사용한 생성 설정 저장 컬럼 추가
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS last_image_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_image_size VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_image_style_id UUID REFERENCES styles(id),
ADD COLUMN IF NOT EXISTS last_video_model VARCHAR(100);

-- 기본값 설정 (선택사항)
UPDATE projects 
SET 
  last_image_model = 'gpt-image-1',
  last_image_size = '1024x1024',
  last_video_model = 'veo2'
WHERE last_image_model IS NULL;

-- 인덱스 추가 (선택사항, 성능 향상)
CREATE INDEX IF NOT EXISTS idx_projects_last_image_style ON projects(last_image_style_id);