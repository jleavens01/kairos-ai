-- Migration: Simplify reference_materials table
-- Remove unused columns and optimize schema

-- Drop existing indexes that reference columns to be removed
DROP INDEX IF EXISTS idx_reference_materials_category;
DROP INDEX IF EXISTS idx_reference_materials_tags;

-- Remove unused columns
ALTER TABLE reference_materials 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS source_id,
DROP COLUMN IF EXISTS media_type,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS wikipedia_extract,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS deleted_at;

-- The metadata column will store:
-- {
--   "license": { "name": "CC BY-SA 4.0", "url": "..." },
--   "imageMetadata": { "width": 1920, "height": 1080, "uploadedBy": "...", "timestamp": "..." },
--   "attribution": { "artist": "...", "credit": "..." }
-- }

-- Ensure metadata column has proper default
ALTER TABLE reference_materials 
ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- Add comment to explain metadata structure
COMMENT ON COLUMN reference_materials.metadata IS 'Stores license info, image dimensions, and attribution data as JSONB';

-- Recreate only necessary indexes
CREATE INDEX IF NOT EXISTS idx_reference_materials_project_id ON reference_materials(project_id);
CREATE INDEX IF NOT EXISTS idx_reference_materials_user_id ON reference_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_materials_source_type ON reference_materials(source_type);
CREATE INDEX IF NOT EXISTS idx_reference_materials_created_at ON reference_materials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reference_materials_is_favorite ON reference_materials(is_favorite) WHERE is_favorite = true;