-- Migration: Add original_text column to tts_audio table
-- Date: 2025-01-10
-- Purpose: Store the original text before processing for TTS

-- Add original_text column if it doesn't exist
ALTER TABLE public.tts_audio 
ADD COLUMN IF NOT EXISTS original_text TEXT;

-- Add comment for the new column
COMMENT ON COLUMN public.tts_audio.original_text IS '원본 텍스트 (파싱 전)';

-- Update existing records to have original_text same as text if null
UPDATE public.tts_audio 
SET original_text = text 
WHERE original_text IS NULL;