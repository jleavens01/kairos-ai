-- gen_images 테이블 RLS 정책 수정
-- Supabase SQL Editor에서 실행

-- 먼저 RLS 활성화 확인
ALTER TABLE gen_images ENABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON gen_images;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON gen_images;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON gen_images;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON gen_images;
DROP POLICY IF EXISTS "Users can view their own images" ON gen_images;
DROP POLICY IF EXISTS "Users can insert their own images" ON gen_images;
DROP POLICY IF EXISTS "Users can update their own images" ON gen_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON gen_images;

-- 간단한 정책: 인증된 사용자는 모든 작업 가능 (임시)
CREATE POLICY "Authenticated users can select" ON gen_images
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert" ON gen_images
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update" ON gen_images
    FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete" ON gen_images
    FOR DELETE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 또는 사용자별 정책 (더 안전함)
/*
-- 사용자가 자신의 이미지만 조회
CREATE POLICY "Users can view own images" ON gen_images
    FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자가 자신의 이미지만 생성
CREATE POLICY "Users can insert own images" ON gen_images
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 이미지만 수정
CREATE POLICY "Users can update own images" ON gen_images
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 이미지만 삭제
CREATE POLICY "Users can delete own images" ON gen_images
    FOR DELETE
    USING (auth.uid() = user_id);
*/

-- gen_videos 테이블도 동일하게 설정
ALTER TABLE gen_videos ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON gen_videos;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON gen_videos;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON gen_videos;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON gen_videos;

-- 새 정책 추가
CREATE POLICY "Authenticated users can select videos" ON gen_videos
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can insert videos" ON gen_videos
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can update videos" ON gen_videos
    FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated users can delete videos" ON gen_videos
    FOR DELETE
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');