-- Profile 테이블에 테마 모드 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark'));

-- 기존 사용자들의 테마를 light로 설정
UPDATE profiles 
SET theme_mode = 'light' 
WHERE theme_mode IS NULL;

-- 테마 모드 인덱스 생성 (선택적)
CREATE INDEX IF NOT EXISTS idx_profiles_theme_mode ON profiles(theme_mode);