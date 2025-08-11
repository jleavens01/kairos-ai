-- production_sheets 테이블에 새 행을 추가하는 RPC 함수 (개선된 버전)
-- 임시 씬 번호를 사용하여 충돌 방지

CREATE OR REPLACE FUNCTION add_production_sheet_row(
  p_project_id uuid,
  p_after_scene_number integer
) RETURNS void AS $$
DECLARE
  new_scene_number integer;
  max_scene_number integer;
BEGIN
  -- 새로 삽입할 씬 번호 계산
  new_scene_number := p_after_scene_number + 1;
  
  -- 현재 최대 씬 번호 확인
  SELECT COALESCE(MAX(scene_number), 0) 
  INTO max_scene_number
  FROM production_sheets 
  WHERE project_id = p_project_id;
  
  -- 임시로 큰 번호로 이동 (충돌 방지)
  UPDATE production_sheets 
  SET scene_number = scene_number + 10000
  WHERE project_id = p_project_id 
    AND scene_number >= new_scene_number;
  
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
  
  -- 임시 번호를 정상 번호로 되돌리기
  UPDATE production_sheets 
  SET scene_number = scene_number - 10000 + 1
  WHERE project_id = p_project_id 
    AND scene_number >= 10000;
    
EXCEPTION
  WHEN unique_violation THEN
    -- 유니크 제약 위반 시 마지막에 추가
    RAISE NOTICE 'Unique violation detected, adding at the end';
    
    -- 마지막 씬 번호 찾기
    SELECT COALESCE(MAX(scene_number), 0) + 1 
    INTO new_scene_number
    FROM production_sheets 
    WHERE project_id = p_project_id
    AND scene_number < 10000;  -- 임시 번호 제외
    
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
    
    -- 임시 번호 정리
    UPDATE production_sheets 
    SET scene_number = scene_number - 10000 + 1
    WHERE project_id = p_project_id 
      AND scene_number >= 10000;
END;
$$ LANGUAGE plpgsql;