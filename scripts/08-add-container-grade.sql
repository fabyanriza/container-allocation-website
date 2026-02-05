-- Add container grade column to containers table
ALTER TABLE containers
ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'B' CHECK (grade IN ('A', 'B', 'C'));

-- Add index for grade filtering
CREATE INDEX IF NOT EXISTS idx_containers_grade ON containers(grade);

-- Add comment for clarity
COMMENT ON COLUMN containers.grade IS 'Container grade: A=Premium, B=Standard, C=Regular';
