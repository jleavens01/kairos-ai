-- gen_images 테이블 RLS 정책 수정
-- 403 오류 해결을 위한 RLS 정책 업데이트

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own images" ON gen_images;
DROP POLICY IF EXISTS "Users can insert their own images" ON gen_images;
DROP POLICY IF EXISTS "Users can update their own images" ON gen_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON gen_images;
DROP POLICY IF EXISTS "Service role can do everything" ON gen_images;

-- RLS 활성화 확인
ALTER TABLE gen_images ENABLE ROW LEVEL SECURITY;

-- 1. 사용자가 자신의 이미지를 조회할 수 있도록 허용
CREATE POLICY "Users can view their own images" ON gen_images
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- 2. 사용자가 자신의 이미지를 생성할 수 있도록 허용
CREATE POLICY "Users can insert their own images" ON gen_images
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- 3. 사용자가 자신의 이미지를 수정할 수 있도록 허용
CREATE POLICY "Users can update their own images" ON gen_images
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- 4. 사용자가 자신의 이미지를 삭제할 수 있도록 허용
CREATE POLICY "Users can delete their own images" ON gen_images
    FOR DELETE
    USING (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- 5. 서비스 역할은 모든 작업 가능 (서버사이드 함수용)
CREATE POLICY "Service role can do everything" ON gen_images
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 6. Anon 사용자도 INSERT 가능하도록 임시 허용 (이미지 생성 초기 단계)
CREATE POLICY "Anon users can insert temporarily" ON gen_images
    FOR INSERT
    WITH CHECK (
        auth.role() = 'anon' 
        AND user_id IS NOT NULL
    );

-- gen_videos 테이블에도 동일한 정책 적용
DROP POLICY IF EXISTS "Users can view their own videos" ON gen_videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON gen_videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON gen_videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON gen_videos;
DROP POLICY IF EXISTS "Service role can do everything" ON gen_videos;

ALTER TABLE gen_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own videos" ON gen_videos
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own videos" ON gen_videos
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own videos" ON gen_videos
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own videos" ON gen_videos
    FOR DELETE
    USING (
        auth.uid() = user_id 
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can do everything" ON gen_videos
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anon users can insert temporarily" ON gen_videos
    FOR INSERT
    WITH CHECK (
        auth.role() = 'anon' 
        AND user_id IS NOT NULL
    );