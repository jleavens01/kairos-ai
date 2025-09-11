-- 공유받은 프로젝트의 데이터에 접근할 수 있도록 RLS 정책 업데이트

-- 기존 공유 정책들이 있다면 먼저 삭제
DROP POLICY IF EXISTS "공유받은 사용자는 공유받은 프로젝트의 이미지를 볼 수 있음" ON gen_images;
DROP POLICY IF EXISTS "공유받은 사용자는 공유받은 프로젝트의 비디오를 볼 수 있음" ON gen_videos;
DROP POLICY IF EXISTS "공유받은 사용자는 공유받은 프로젝트의 TTS를 볼 수 있음" ON tts_audio;
DROP POLICY IF EXISTS "공유받은 사용자는 공유받은 프로젝트의 프로덕션 시트를 볼 수 있음" ON production_sheets;
-- storyboards 테이블이 없으므로 제거
DROP POLICY IF EXISTS "공유받은 사용자는 공유받은 프로젝트의 레퍼런스를 볼 수 있음" ON reference_materials;

-- 편집 권한 정책들도 삭제
DROP POLICY IF EXISTS "편집자는 공유받은 프로젝트의 이미지를 수정할 수 있음" ON gen_images;
DROP POLICY IF EXISTS "편집자는 공유받은 프로젝트의 비디오를 수정할 수 있음" ON gen_videos;
DROP POLICY IF EXISTS "편집자는 공유받은 프로젝트의 TTS를 수정할 수 있음" ON tts_audio;
DROP POLICY IF EXISTS "편집자는 공유받은 프로젝트의 프로덕션 시트를 수정할 수 있음" ON production_sheets;
-- storyboards 편집 정책도 제거
DROP POLICY IF EXISTS "편집자는 공유받은 프로젝트의 레퍼런스를 수정할 수 있음" ON reference_materials;

-- gen_images 테이블에 공유 정책 추가
CREATE POLICY "공유받은 사용자는 공유받은 프로젝트의 이미지를 볼 수 있음" ON gen_images
  FOR SELECT USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- gen_videos 테이블에 공유 정책 추가
CREATE POLICY "공유받은 사용자는 공유받은 프로젝트의 비디오를 볼 수 있음" ON gen_videos
  FOR SELECT USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- tts_audio 테이블에 공유 정책 추가 (scene_id를 통해 project_id 연결)
CREATE POLICY "공유받은 사용자는 공유받은 프로젝트의 TTS를 볼 수 있음" ON tts_audio
  FOR SELECT USING (
    scene_id IN (
      SELECT ps.id 
      FROM production_sheets ps
      JOIN project_shares psh ON ps.project_id = psh.project_id
      WHERE psh.shared_with_user_id = auth.uid()
    )
  );

-- production_sheets 테이블에 공유 정책 추가
CREATE POLICY "공유받은 사용자는 공유받은 프로젝트의 프로덕션 시트를 볼 수 있음" ON production_sheets
  FOR SELECT USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- storyboards 테이블이 없으므로 제거 (production_sheets에서 처리)

-- reference_materials 테이블에 공유 정책 추가
CREATE POLICY "공유받은 사용자는 공유받은 프로젝트의 레퍼런스를 볼 수 있음" ON reference_materials
  FOR SELECT USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- 공유받은 사용자는 editor 권한이 있을 때만 수정/삭제 가능
-- gen_images 편집 권한
CREATE POLICY "편집자는 공유받은 프로젝트의 이미지를 수정할 수 있음" ON gen_images
  FOR ALL USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid() 
      AND permission_level = 'editor'
    )
  );

-- gen_videos 편집 권한
CREATE POLICY "편집자는 공유받은 프로젝트의 비디오를 수정할 수 있음" ON gen_videos
  FOR ALL USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid() 
      AND permission_level = 'editor'
    )
  );

-- tts_audio 편집 권한
CREATE POLICY "편집자는 공유받은 프로젝트의 TTS를 수정할 수 있음" ON tts_audio
  FOR ALL USING (
    scene_id IN (
      SELECT ps.id 
      FROM production_sheets ps
      JOIN project_shares psh ON ps.project_id = psh.project_id
      WHERE psh.shared_with_user_id = auth.uid() 
      AND psh.permission_level = 'editor'
    )
  );

-- production_sheets 편집 권한
CREATE POLICY "편집자는 공유받은 프로젝트의 프로덕션 시트를 수정할 수 있음" ON production_sheets
  FOR ALL USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid() 
      AND permission_level = 'editor'
    )
  );

-- storyboards 편집 권한 제거 (production_sheets에서 처리)

-- reference_materials 편집 권한
CREATE POLICY "편집자는 공유받은 프로젝트의 레퍼런스를 수정할 수 있음" ON reference_materials
  FOR ALL USING (
    project_id IN (
      SELECT project_id 
      FROM project_shares 
      WHERE shared_with_user_id = auth.uid() 
      AND permission_level = 'editor'
    )
  );