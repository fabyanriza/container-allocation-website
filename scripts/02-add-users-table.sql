-- Create users table for operator management
CREATE TABLE IF NOT EXISTS operators (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'operator',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add activity and logistics fields to containers if they don't exist
ALTER TABLE containers ADD COLUMN IF NOT EXISTS activity TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS logistics TEXT DEFAULT 'no';
ALTER TABLE containers ADD COLUMN IF NOT EXISTS recommended_depot TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email);
CREATE INDEX IF NOT EXISTS idx_operators_is_active ON operators(is_active);
