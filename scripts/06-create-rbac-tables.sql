-- Script untuk membuat users table
-- Jalankan ini di Supabase SQL Editor

-- 1. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'operator' CHECK (role IN ('superadmin', 'depot_manager', 'operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
);

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Create index for role lookup
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'view')),
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  changes JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON public.activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- 3. Enable RLS (Row Level Security) untuk users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk superadmin dapat lihat semua users
CREATE POLICY "Superadmin can view all users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'superadmin'
    )
  );

-- Buat policy untuk users dapat lihat data mereka sendiri
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT
  USING (
    email = auth.jwt() ->> 'email'
  );

-- 4. Enable RLS untuk activity_logs table
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk superadmin dapat lihat semua logs
CREATE POLICY "Superadmin can view all activity logs" ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'superadmin'
    )
  );

-- Buat policy untuk users dapat lihat logs mereka sendiri
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
  FOR SELECT
  USING (
    user_email = auth.jwt() ->> 'email'
  );

-- 5. Insert sample data (optional)
-- Superadmin user
INSERT INTO public.users (email, role) VALUES
  ('admin@example.com', 'superadmin'),
  ('manager@example.com', 'depot_manager'),
  ('operator@example.com', 'operator')
ON CONFLICT (email) DO NOTHING;

-- Print confirmation
SELECT 'Tables created successfully!' as status;
