-- Add keep column to gen_images table
ALTER TABLE gen_images 
ADD COLUMN IF NOT EXISTS is_kept BOOLEAN DEFAULT false;

-- Add keep column to gen_videos table  
ALTER TABLE gen_videos
ADD COLUMN IF NOT EXISTS is_kept BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gen_images_is_kept ON gen_images(is_kept);
CREATE INDEX IF NOT EXISTS idx_gen_videos_is_kept ON gen_videos(is_kept);

-- Update existing rows to have false as default
UPDATE gen_images SET is_kept = false WHERE is_kept IS NULL;
UPDATE gen_videos SET is_kept = false WHERE is_kept IS NULL;