-- 6. channel_profiles 테이블 (채널 프로필 저장)
CREATE TABLE IF NOT EXISTS channel_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id VARCHAR(100) UNIQUE NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    profile_data JSONB NOT NULL, -- 전체 채널 프로필
    customizations JSONB DEFAULT '{}', -- 사용자 커스터마이징
    analytics JSONB DEFAULT '{}', -- 채널 분석 데이터
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_channel_profiles_channel ON channel_profiles(channel_id);
CREATE INDEX idx_channel_profiles_active ON channel_profiles(is_active);

-- RLS 활성화
ALTER TABLE channel_profiles ENABLE ROW LEVEL SECURITY;

-- 서비스 역할 접근 정책
CREATE POLICY "Service role access for channel_profiles" ON channel_profiles 
    FOR ALL USING (true);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_channel_profiles_updated_at 
    BEFORE UPDATE ON channel_profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();