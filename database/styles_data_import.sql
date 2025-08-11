-- styles 테이블 데이터 삽입
-- semoji_auto에서 가져온 스타일 데이터

INSERT INTO public.styles (
  id, 
  project_id, 
  style_code, 
  name, 
  description, 
  type, 
  base_image_url, 
  image_ratio, 
  config, 
  created_at, 
  updated_at, 
  user_id, 
  storage_image_path, 
  migrated_at, 
  scene_style_description
) VALUES 
-- style001: 세모지스타일
('e03c1bd1-ba82-43e3-9f6e-3d372d81423b'::uuid, null, 'style001', '세모지스타일', 'Borderless 2d flat design', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1746712294/dusapthnkanldv5ej20r.png', null, null, '2025-06-09 04:30:27.199104+00', '2025-06-09 04:30:27.199104+00', null, null, null, 'The attached image is a 2D flat design with no border in style.'),

-- style002: 픽셀아트
('85bec286-357c-42f0-bf71-9162589c66fc'::uuid, null, 'style002', '픽셀아트', 'a full-body, front-facing male character in high-resolution pixel art style, detailed shading, neutral pose', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1747206131/wjbkadcnq6y1mdro2h34.png', null, null, '2025-06-10 02:04:41.356352+00', '2025-06-10 02:04:41.356352+00', null, null, null, 'High resolution pixel art style, detailed shading, neutral poses.'),

-- style003: 클레이 애니 스타일
('824c20e9-7f48-4559-9e30-229eac8d55ae'::uuid, null, 'style003', '클레이 애니 스타일', 'a full-body, front-facing male character in clay animation style, textured surface, stop-motion look', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291928/%ED%81%B4%EB%A0%88%EC%9D%B4%EC%95%A0%EB%8B%88%EC%8A%A4%ED%83%80%EC%9D%BC_hzpknb.png', null, null, '2025-06-19 00:13:26.32621+00', '2025-06-19 00:13:26.32621+00', null, null, null, 'Clay animation style, textured surface'),

-- style004: 로블록스 스타일
('25472102-1af8-45df-873c-3cc9541df4d7'::uuid, null, 'style004', '로블록스 스타일', 'a full-body, front-facing Roblox character, blocky limbs, simple facial features, casual outfit', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291926/%EB%A1%9C%EB%B8%94%EB%A1%9D%EC%8A%A4_%EC%BA%90%EB%A6%AD%ED%84%B0%EC%9D%98_3D_%EC%9D%B4%EB%AF%B8%EC%A7%80_jvaes0.png', null, null, '2025-06-19 00:14:45.881801+00', '2025-06-19 00:14:45.881801+00', null, null, null, 'Roblox game style'),

-- style005: 그림책 스타일
('6f737e8b-8c20-4a25-8956-a47a7faa1d6c'::uuid, null, 'style005', '그림책 스타일', 'a full-body, front-facing male character in children''s picture book illustration style, warm colors, soft textures', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291926/%EA%B7%B8%EB%A6%BC%EC%B1%85%EC%8A%A4%ED%83%80%EC%9D%BC_sbvzu9.png', null, null, '2025-06-19 00:15:39.700776+00', '2025-06-19 00:15:39.700776+00', null, null, null, 'Children''s picture book style, warm colors, soft textures'),

-- style006: 픽사 스타일
('934ec4c1-ae97-44e3-a56e-164f698eb26d'::uuid, null, 'style006', '픽사 스타일', 'a full-body, front-facing male character in Pixar 3D style, round facial features, friendly look, soft lighting', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291928/%ED%94%BD%EC%82%AC%EC%8A%A4%ED%83%80%EC%9D%BC_iepaqj.png', null, null, '2025-06-19 00:17:10.683696+00', '2025-06-19 00:17:10.683696+00', null, null, null, 'Pixar 3D style, soft lighting'),

-- style007: 실사 스타일
('5ad96962-3246-4c4b-a55f-c4f58c437765'::uuid, null, 'style007', '실사 스타일', 'a full-body, front-facing male character in realistic style, casual outfit, neutral expression, plain background', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291926/%EC%8B%A4%EC%82%AC%EC%8A%A4%ED%83%80%EC%9D%BC_ehalzt.png', null, null, '2025-06-19 00:18:14.543469+00', '2025-06-19 00:18:14.543469+00', null, null, null, 'Realistic style'),

-- style008: 레고 스타일
('494be240-6619-4862-bc75-0a97ce815c75'::uuid, null, 'style008', '레고 스타일', 'a full-body, front-facing male LEGO minifigure, casual modern outfit, smooth plastic surface, white background, 머리는 반드시 레고의 머리 블록 방식이어야 함.', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291927/%EB%A0%88%EA%B3%A0_%EB%82%A8%EC%84%B1_%EB%AF%B8%EB%8B%88%ED%94%BC%EA%B2%A8_%EC%B4%88%EC%83%81_snh7cc.png', null, null, '2025-06-19 00:19:21.673059+00', '2025-06-19 00:19:21.673059+00', null, null, null, 'LEGO cinema style, characters must be in the form of LEGO head blocks, and elements must be in the form of combinations of existing LEGO blocks.'),

-- style009: 수채화 스타일
('8079f402-cd05-4d05-8651-480bc826d760'::uuid, null, 'style009', '수채화 스타일', 'a full-body, front-facing male character in watercolor painting style, soft edges, hand-painted look', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291925/%EC%88%98%EC%B1%84%ED%99%94_%EC%86%8D_%ED%8E%B8%EC%95%88%ED%95%9C_%EB%82%A8%EC%9E%90_lqqdrf.png', null, null, '2025-06-19 00:19:55.560307+00', '2025-06-19 00:19:55.560307+00', null, null, null, 'Watercolor style, soft edges, hand-drawn feel'),

-- style010: 90년대 미국 카툰 스타일
('4bd6037a-0d1b-41a7-bbfd-855400fb712c'::uuid, null, 'style010', '90년대 미국 카툰 스타일', 'a full-body, front-facing male character in 1990s American cartoon style, exaggerated proportions, bold lines', 'ELEMENT_ART_STYLE', 'https://res.cloudinary.com/duviejvhy/image/upload/v1750291924/90%EB%85%84%EB%8C%80_%EC%8A%A4%ED%83%80%EC%9D%BC%EC%9D%98_%EC%BA%90%EC%A3%BC%EC%96%BC%ED%95%9C_%EC%BA%90%EB%A6%AD%ED%84%B0_yyrghn.png', null, null, '2025-06-19 00:20:43.845625+00', '2025-06-19 00:20:43.845625+00', null, null, null, '1990s American comic book style, exaggerated proportions, bold lines'),

-- style011: 건강의벗 독자수필 스타일
('bb58a7e8-0965-4907-ae35-e8baf4977166'::uuid, null, 'style011', '건강의벗 독자수필 스타일', 'A simple full-body line drawing with slightly exaggerated proportions in a soft gray palette. The style is reminiscent of charming children''s book illustrations, with outlines of pencil lines and minimal shading to suggest forms.', 'ELEMENT_ART_STYLE', 'https://sykvtyubvpngwxsnlhyn.supabase.co/storage/v1/object/public/reference-images/sytle/yuhan_character1.png', null, null, '2025-07-09 02:01:20.937096+00', '2025-07-09 02:01:20.937096+00', null, null, null, '음영 없이 연필 테두리 선만 살린 심플한 라인 드로잉. 절대 채색 없음.')

ON CONFLICT (id) DO UPDATE SET
  style_code = EXCLUDED.style_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  base_image_url = EXCLUDED.base_image_url,
  scene_style_description = EXCLUDED.scene_style_description,
  updated_at = NOW();