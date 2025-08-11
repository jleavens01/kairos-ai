-- production_sheets 테이블에 새 행을 추가하는 RPC 함수 (개선된 버전)
-- 트랜잭션과 에러 처리 추가

CREATE OR REPLACE FUNCTION add_production_sheet_row(
  p_project_id uuid,
  p_after_scene_number integer
) RETURNS void AS $$
DECLARE
  new_scene_number integer;
BEGIN
  -- 트랜잭션 시작 (자동)
  
  -- 새로 삽입할 씬 번호 계산
  new_scene_number := p_after_scene_number + 1;
  
  -- 기존 씬들을 뒤로 밀기 위해 역순으로 처리
  -- 먼저 최대 씬 번호부터 처리하여 충돌 방지
  FOR i IN REVERSE (
    SELECT MAX(scene_number) FROM production_sheets 
    WHERE project_id = p_project_id 
    AND scene_number >= new_scene_number
  )..new_scene_number LOOP
    UPDATE production_sheets 
    SET scene_number = scene_number + 1 
    WHERE project_id = p_project_id 
      AND scene_number = i;
  END LOOP;
  
  -- 새로운 행 삽입
  INSERT INTO production_sheets (
    project_id, 
    scene_number, 
    original_script_text, 
    characters,
    backgrounds,
    props,
    director_guide
  ) VALUES (
    p_project_id, 
    new_scene_number, 
    '',                 -- 빈 스크립트
    ARRAY[]::text[],    -- 빈 캐릭터 배열
    ARRAY[]::text[],    -- 빈 배경 배열
    ARRAY[]::text[],    -- 빈 소품 배열
    ''                  -- 빈 연출 가이드
  );
  
  -- 트랜잭션 커밋 (자동)
EXCEPTION
  WHEN unique_violation THEN
    -- 유니크 제약 위반 시 다시 시도
    RAISE NOTICE 'Unique violation detected, retrying with sequential numbering';
    
    -- 마지막 씬 번호 찾기
    SELECT COALESCE(MAX(scene_number), 0) + 1 
    INTO new_scene_number
    FROM production_sheets 
    WHERE project_id = p_project_id;
    
    -- 다시 삽입 시도
    INSERT INTO production_sheets (
      project_id, 
      scene_number, 
      original_script_text, 
      characters,
      backgrounds,
      props,
      director_guide
    ) VALUES (
      p_project_id, 
      new_scene_number, 
      '',                 
      ARRAY[]::text[],    
      ARRAY[]::text[],    
      ARRAY[]::text[],    
      ''                  
    );
END;
$$ LANGUAGE plpgsql;