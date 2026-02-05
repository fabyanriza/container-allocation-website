-- Update containers table schema to match import format
-- Add missing columns for voyage, booking number, container type, and grade

-- Add missing columns if they don't exist
ALTER TABLE containers
ADD COLUMN IF NOT EXISTS prevcy TEXT,                    -- Voyage/previous code
ADD COLUMN IF NOT EXISTS bookno TEXT,                    -- Booking number
ADD COLUMN IF NOT EXISTS cont_type TEXT,                 -- Container type (20 DC, 40 DC, etc)
ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'B' CHECK (grade IN ('A', 'B', 'C'));

-- Update logistics column to ensure it has a default value
ALTER TABLE containers
ALTER COLUMN logistics SET DEFAULT false;

-- Add indexes for new columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_containers_prevcy ON containers(prevcy);
CREATE INDEX IF NOT EXISTS idx_containers_bookno ON containers(bookno);
CREATE INDEX IF NOT EXISTS idx_containers_cont_type ON containers(cont_type);
CREATE INDEX IF NOT EXISTS idx_containers_grade ON containers(grade);

-- Add comments for clarity
COMMENT ON COLUMN containers.prevcy IS 'Voyage or previous code';
COMMENT ON COLUMN containers.bookno IS 'Booking number';
COMMENT ON COLUMN containers.cont_type IS 'Container type (20 DC, 40 DC, 20 HC, 40 HC, etc)';
COMMENT ON COLUMN containers.grade IS 'Container grade: A=Premium, B=Standard, C=Regular';
