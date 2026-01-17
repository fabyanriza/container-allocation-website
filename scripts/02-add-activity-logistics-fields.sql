-- Add new columns to containers table for activity and logistics
ALTER TABLE containers 
ADD COLUMN IF NOT EXISTS activity TEXT CHECK (activity IN ('stripping_luar', 'stripping_dalam', 'stuffing_luar', 'stuffing_dalam')),
ADD COLUMN IF NOT EXISTS logistics BOOLEAN DEFAULT false;

-- Update containers table to make activity required for new entries
-- (existing records can have null values for backward compatibility)
