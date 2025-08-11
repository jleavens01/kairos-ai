-- production_sheets 테이블의 RLS 정책 업데이트
-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Enable read access for project members" ON public.production_sheets;
DROP POLICY IF EXISTS "Enable insert for project members" ON public.production_sheets;
DROP POLICY IF EXISTS "Enable update for project members" ON public.production_sheets;
DROP POLICY IF EXISTS "Enable delete for project members" ON public.production_sheets;

-- RLS 활성화 (이미 되어있을 수 있음)
ALTER TABLE public.production_sheets ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있음 (임시)
CREATE POLICY "Anyone can read production_sheets" ON public.production_sheets
  FOR SELECT USING (true);

-- 모든 사용자가 삽입할 수 있음 (임시)
CREATE POLICY "Anyone can insert production_sheets" ON public.production_sheets
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 수정할 수 있음 (임시)
CREATE POLICY "Anyone can update production_sheets" ON public.production_sheets
  FOR UPDATE USING (true);

-- 모든 사용자가 삭제할 수 있음 (임시)
CREATE POLICY "Anyone can delete production_sheets" ON public.production_sheets
  FOR DELETE USING (true);