-- production_sheets 테이블에서 행을 삭제하고 재정렬하는 RPC 함수

CREATE OR REPLACE FUNCTION delete_production_sheet_rows_and_renumber(
  p_project_id uuid,
  p_ids_to_delete uuid[]
) RETURNS void AS $$
DECLARE
  deleted_scene_numbers integer[];
  min_deleted_number integer;
BEGIN
  -- 삭제할 씬들의 번호 조회
  SELECT ARRAY_AGG(scene_number ORDER BY scene_number) 
  INTO deleted_scene_numbers
  FROM production_sheets 
  WHERE project_id = p_project_id 
    AND id = ANY(p_ids_to_delete);
  
  -- 삭제할 씬이 없으면 종료
  IF deleted_scene_numbers IS NULL OR array_length(deleted_scene_numbers, 1) = 0 THEN
    RETURN;
  END IF;
  
  -- 최소 삭제 씬 번호
  min_deleted_number := deleted_scene_numbers[1];
  
  -- 씬들 삭제
  DELETE FROM production_sheets 
  WHERE project_id = p_project_id 
    AND id = ANY(p_ids_to_delete);
  
  -- 남은 씬들의 번호를 재정렬
  WITH numbered_scenes AS (
    SELECT id, 
           ROW_NUMBER() OVER (ORDER BY scene_number) as new_number
    FROM production_sheets
    WHERE project_id = p_project_id
  )
  UPDATE production_sheets ps
  SET scene_number = ns.new_number
  FROM numbered_scenes ns
  WHERE ps.id = ns.id
    AND ps.scene_number != ns.new_number;
    
END;
$$ LANGUAGE plpgsql;