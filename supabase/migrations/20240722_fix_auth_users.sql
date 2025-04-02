-- Fix for users table and authentication

-- Ensure the users table has the correct structure
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS token_identifier text;

-- Disable RLS temporarily for fixing user data
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Update the handle_new_user function to properly handle user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    user_id,
    email,
    name,
    full_name,
    avatar_url,
    token_identifier,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a policy for users to read their own data
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
FOR SELECT USING (auth.uid()::text = user_id);

-- Create a policy for users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
FOR UPDATE USING (auth.uid()::text = user_id);

-- Create a policy for service role to manage all users
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
CREATE POLICY "Service role can manage all users" ON public.users
USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;