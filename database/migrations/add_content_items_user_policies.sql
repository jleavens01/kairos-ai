-- content_items 테이블에 사용자별 접근 정책 추가

-- 1. 먼저 user_id 컬럼 추가
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. user_id 컬럼에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_content_items_user_id ON content_items(user_id);

-- 3. 기존 서비스 역할 정책은 유지하고, 사용자별 정책 추가
-- 인증된 사용자는 자신의 콘텐츠만 볼 수 있음
CREATE POLICY "Users can view own content_items" 
    ON content_items 
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' 
        AND (
            user_id = auth.uid() 
            OR user_id IS NULL  -- user_id가 없는 공용 콘텐츠도 볼 수 있음
        )
    );

-- 인증된 사용자는 자신의 콘텐츠만 생성할 수 있음  
CREATE POLICY "Users can insert own content_items" 
    ON content_items 
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' 
        AND (
            user_id = auth.uid() 
            OR user_id IS NULL  -- user_id 없이도 생성 가능 (선택적)
        )
    );

-- 인증된 사용자는 자신의 콘텐츠만 수정할 수 있음
CREATE POLICY "Users can update own content_items" 
    ON content_items 
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated' 
        AND user_id = auth.uid()
    );

-- 인증된 사용자는 자신의 콘텐츠만 삭제할 수 있음
CREATE POLICY "Users can delete own content_items" 
    ON content_items 
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' 
        AND user_id = auth.uid()
    );