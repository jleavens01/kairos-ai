-- ⚠️ 안전한 버전: DROP 구문이 없는 프로필 테이블 생성
-- 이 파일은 처음 실행하거나 DROP 경고를 피하고 싶을 때 사용하세요

-- profiles 테이블 (사용자 프로필 및 크레딧/티어 관리)
CREATE TABLE IF NOT EXISTS profiles (
  -- 기본 정보
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  
  -- 닉네임 (유니크하게 설정)
  nickname VARCHAR(30) UNIQUE,
  display_name VARCHAR(100), -- 표시 이름 (닉네임이 없을 때 사용)
  avatar_url TEXT,
  bio TEXT,
  
  -- 크레딧 시스템
  credits INTEGER DEFAULT 100 NOT NULL,
  total_credits_purchased INTEGER DEFAULT 0,
  total_credits_used INTEGER DEFAULT 0,
  monthly_credits_used INTEGER DEFAULT 0,
  credits_reset_at TIMESTAMPTZ,
  
  -- 티어 시스템
  tier VARCHAR(20) DEFAULT 'free' NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  tier_expires_at TIMESTAMPTZ,
  tier_benefits JSONB DEFAULT '{}',
  
  -- 사용량 제한
  max_projects INTEGER DEFAULT 3,
  max_storage_mb INTEGER DEFAULT 500,
  max_ai_requests_daily INTEGER DEFAULT 10,
  max_collaborators_per_project INTEGER DEFAULT 0,
  
  -- 사용 통계
  total_projects INTEGER DEFAULT 0,
  total_ai_generations INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10,2) DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 설정
  preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{"email": true, "push": false}',
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거가 없을 때만 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 정책이 없을 때만 생성
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Public can view profiles by nickname'
    ) THEN
        CREATE POLICY "Public can view profiles by nickname" ON profiles
            FOR SELECT USING (nickname IS NOT NULL);
    END IF;
END $$;

-- 새 사용자 등록 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 이미 프로필이 있는지 확인
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = new.id) THEN
    INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', new.email),
      new.raw_user_meta_data->>'avatar_url'
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 없을 때만 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 닉네임 유효성 검사 함수
CREATE OR REPLACE FUNCTION validate_nickname()
RETURNS TRIGGER AS $$
BEGIN
  -- 닉네임 규칙: 3-20자, 영문/숫자/언더스코어만 허용
  IF NEW.nickname IS NOT NULL THEN
    IF LENGTH(NEW.nickname) < 3 OR LENGTH(NEW.nickname) > 20 THEN
      RAISE EXCEPTION '닉네임은 3-20자 사이여야 합니다';
    END IF;
    IF NEW.nickname !~ '^[a-zA-Z0-9_]+$' THEN
      RAISE EXCEPTION '닉네임은 영문, 숫자, 언더스코어(_)만 사용 가능합니다';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거가 없을 때만 생성
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_nickname_trigger') THEN
        CREATE TRIGGER validate_nickname_trigger
            BEFORE INSERT OR UPDATE ON profiles
            FOR EACH ROW EXECUTE FUNCTION validate_nickname();
    END IF;
END $$;