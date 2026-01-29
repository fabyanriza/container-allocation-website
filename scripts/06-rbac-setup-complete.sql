-- SQL Scripts untuk RBAC Implementation
-- Jalankan semua scripts ini di Supabase SQL Editor

-- ============================================
-- 1. CREATE USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'operator' CHECK (role IN ('superadmin', 'depot_manager', 'operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================
-- 2. CREATE ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'view')),
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  changes JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON public.activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) - Users Table
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmin dapat view semua users
DROP POLICY IF EXISTS "Superadmin can view all users" ON public.users;
CREATE POLICY "Superadmin can view all users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'superadmin'
    )
  );

-- Policy: Users dapat view data mereka sendiri
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT
  USING (
    email = auth.jwt() ->> 'email'
  );

-- Policy: Superadmin dapat insert/update/delete users
DROP POLICY IF EXISTS "Superadmin can manage users" ON public.users;
CREATE POLICY "Superadmin can manage users" ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'superadmin'
    )
  );

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) - Activity Logs Table
-- ============================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmin dapat view semua logs
DROP POLICY IF EXISTS "Superadmin can view all activity logs" ON public.activity_logs;
CREATE POLICY "Superadmin can view all activity logs" ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'superadmin'
    )
  );

-- Policy: Users dapat view logs mereka sendiri
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
  FOR SELECT
  USING (
    user_email = auth.jwt() ->> 'email'
  );

-- Policy: Authenticated users dapat insert activity logs
DROP POLICY IF EXISTS "Users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert activity logs" ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    user_email = auth.jwt() ->> 'email'
  );

-- ============================================
-- 5. INSERT SAMPLE DATA (OPTIONAL)
-- ============================================
-- Uncomment jika ingin insert sample users
-- INSERT INTO public.users (email, role) VALUES
--   ('admin@example.com', 'superadmin'),
--   ('manager@example.com', 'depot_manager'),
--   ('operator@example.com', 'operator')
-- ON CONFLICT (email) DO NOTHING;
