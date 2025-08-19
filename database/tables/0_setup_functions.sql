-- 0. 필수 함수 설정 (다른 테이블 생성 전에 먼저 실행)

-- updated_at 자동 업데이트 함수
-- 이 함수는 모든 테이블의 updated_at 컬럼을 자동으로 업데이트합니다
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- CREATE TRIGGER update_[table_name]_updated_at 
--     BEFORE UPDATE ON [table_name]
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column();