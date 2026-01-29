-- ============================================
-- STEP 1: Create Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'operator' 
    CHECK (role IN ('superadmin', 'depot_manager', 'operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================
-- STEP 2: Create Activity Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL 
    CHECK (action IN ('create', 'read', 'update', 'delete', 'view')),
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  changes JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON public.activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ============================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create RLS Policies for Users Table
-- ============================================

-- Policy 1: Superadmin dapat view semua users
CREATE POLICY "Superadmin can view all users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'superadmin'
    )
  );

-- Policy 2: Users dapat view data mereka sendiri
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT
  USING (
    email = auth.jwt() ->> 'email'
  );

-- Policy 3: Superadmin dapat insert/update/delete users
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
-- STEP 5: Create RLS Policies for Activity Logs Table
-- ============================================

-- Policy 1: Superadmin dapat view semua logs
CREATE POLICY "Superadmin can view all activity logs" ON public.activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.email = auth.jwt() ->> 'email'
      AND u.role = 'superadmin'
    )
  );

-- Policy 2: Users dapat view logs mereka sendiri
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
  FOR SELECT
  USING (
    user_email = auth.jwt() ->> 'email'
  );

-- Policy 3: Authenticated users dapat insert activity logs
CREATE POLICY "Users can insert activity logs" ON public.activity_logs
  FOR INSERT
  WITH CHECK (
    user_email = auth.jwt() ->> 'email'
  );

-- ============================================
-- STEP 6: Insert Sample Data (Optional)
-- ============================================
-- Uncomment lines dibawah jika ingin insert sample users

-- INSERT INTO public.users (email, role) VALUES
--   ('admin@example.com', 'superadmin'),
--   ('manager@example.com', 'depot_manager'),
--   ('operator@example.com', 'operator')
-- ON CONFLICT (email) DO NOTHING;

-- ============================================
-- STEP 7: Verification Queries
-- ============================================
-- Run these queries to verify the setup:

-- Check users table structure
-- SELECT * FROM information_schema.columns WHERE table_name = 'users';

-- Check activity_logs table structure
-- SELECT * FROM information_schema.columns WHERE table_name = 'activity_logs';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename IN ('users', 'activity_logs');

-- Check users data
-- SELECT * FROM public.users;

-- Check activity logs data
-- SELECT * FROM public.activity_logs ORDER BY timestamp DESC LIMIT 10;
