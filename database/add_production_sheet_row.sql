-- production_sheets 테이블에 새 행을 추가하는 RPC 함수

CREATE OR REPLACE FUNCTION add_production_sheet_row(
  p_project_id uuid,
  p_after_scene_number integer
) RETURNS void AS $$
BEGIN
  -- 새로 삽입할 씬 번호를 계산
  DECLARE
    new_scene_number integer := p_after_scene_number + 1;
  BEGIN
    -- 기존 씬들의 번호를 증가 (뒤로 밀기)
    UPDATE production_sheets 
    SET scene_number = scene_number + 1 
    WHERE project_id = p_project_id 
      AND scene_number >= new_scene_number;
    
    -- 새로운 행 삽입 (필요한 필드만 설정)
    INSERT INTO production_sheets (
      project_id, 
      scene_number, 
      original_script_text, 
      characters
    ) VALUES (
      p_project_id, 
      new_scene_number, 
      '',                 -- 빈 스크립트
      ARRAY[]::text[]     -- 빈 캐릭터 배열
    );
  END;
END;
$$ LANGUAGE plpgsql;