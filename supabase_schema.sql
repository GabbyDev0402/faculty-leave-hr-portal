-- ==============================================================================
-- Enterprise Faculty Leave & Substitute Management Portal - Supabase Schema
-- ==============================================================================

-- Step 1: Create Custom ENUM Types
CREATE TYPE public.user_role AS ENUM ('teacher', 'admin', 'substitute');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'denied');

-- Step 2: Create Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'teacher',
  full_name TEXT NOT NULL,
  department TEXT DEFAULT NULL,
  leave_balance INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create Leave Requests Table (State Machine)
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  needs_sub BOOLEAN NOT NULL DEFAULT FALSE,
  status public.leave_status NOT NULL DEFAULT 'pending',
  substitute_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper Function: Check if the current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS Policies: Profiles Table
-- ==============================================================================

-- 4.1: Anyone authenticated can view profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 4.2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4.3: Enable insert into profiles (for auth trigger / user setup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- RLS Policies: Leave Requests Table
-- ==============================================================================

-- 4.4: Teachers can SELECT their own leave requests
CREATE POLICY "Teachers can view own leave requests"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

-- 4.5: Teachers can INSERT their own leave requests
CREATE POLICY "Teachers can create own leave requests"
  ON public.leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

-- 4.6: Admins can SELECT all leave requests
CREATE POLICY "Admins can view all leave requests"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 4.7: Admins can UPDATE all leave requests (Approve / Deny / Assign Sub)
CREATE POLICY "Admins can update all leave requests"
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.8: Substitutes can SELECT open, approved jobs needing coverage
CREATE POLICY "Substitutes can view approved open jobs"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (
    needs_sub = TRUE 
    AND status = 'approved'
  );

-- 4.9: Substitutes can UPDATE approved open jobs to claim them
CREATE POLICY "Substitutes can claim approved open jobs"
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    needs_sub = TRUE 
    AND status = 'approved'
    AND (substitute_id IS NULL OR substitute_id = auth.uid())
  )
  WITH CHECK (
    needs_sub = TRUE 
    AND status = 'approved'
    AND substitute_id = auth.uid()
  );

-- ==============================================================================
-- Step 5: Automatic Profile Creation Trigger on Sign Up
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_role public.user_role;
BEGIN
  -- Safe cast from user metadata or fallback to default 'teacher'
  BEGIN
    raw_role := (new.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    raw_role := 'teacher'::public.user_role;
  END;

  INSERT INTO public.profiles (id, full_name, role, department, leave_balance)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(raw_role, 'teacher'::public.user_role),
    new.raw_user_meta_data->>'department',
    COALESCE((new.raw_user_meta_data->>'leave_balance')::INTEGER, 10)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users AFTER INSERT
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Optional Seed Data (Uncomment if testing in SQL Editor)
-- ==============================================================================
/*
-- Sample query to check schema setup:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
*/
