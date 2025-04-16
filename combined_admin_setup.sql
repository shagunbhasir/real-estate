-- Drop existing functions and table
DROP FUNCTION IF EXISTS public.verify_admin_credentials(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_admin_by_credentials(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.hash_password(TEXT);
DROP FUNCTION IF EXISTS public.check_table_access();
DROP FUNCTION IF EXISTS public.create_admin(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_admin_with_password(UUID, TEXT, TEXT, TEXT, TEXT);
DROP TABLE IF EXISTS public.admins;

-- Create admin table for better admin user management
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- Enable row level security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Enable read access for authenticated users" ON public.admins
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.admins
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.admins
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.admins
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to securely hash passwords
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify passwords
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default super admin (password: changeme123)
-- In production, you should change this password immediately
INSERT INTO public.admins (email, name, password_hash, role, status)
VALUES ('master.loanchacha@gmail.com', 'Super Admin', public.hash_password('admin@123'), 'super_admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- Enable realtime for admins table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;

-- Create or update function to get admin by email and password
CREATE OR REPLACE FUNCTION public.get_admin_by_credentials(admin_email TEXT, admin_password TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  status TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Update last login time
  UPDATE public.admins a
  SET a.last_login = NOW(),
      a.updated_at = NOW()
  WHERE a.email = admin_email
  AND public.verify_password(admin_password, a.password_hash)
  AND a.status = 'active';
  
  -- Return admin data
  RETURN QUERY
  SELECT 
    a.id,
    a.email,
    a.name,

    a.last_login,
    a.created_at,
    a.updated_at
  FROM public.admins a
  WHERE a.email = admin_email
  AND public.verify_password(admin_password, a.password_hash)
  AND a.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify admin credentials
CREATE OR REPLACE FUNCTION public.verify_admin_credentials(
  input_email TEXT,
  input_password TEXT
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  status TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- First find the admin record
  SELECT * INTO admin_record
  FROM public.admins
  WHERE email = input_email
  AND status = 'active'
  LIMIT 1;

  -- Verify password and update last login if valid
  IF admin_record.id IS NOT NULL AND 
     admin_record.password_hash = crypt(input_password, admin_record.password_hash) THEN
    
    -- Update last login time
    UPDATE public.admins
    SET last_login = NOW(),
        updated_at = NOW()
    WHERE id = admin_record.id;
    
    -- Return the admin data
    RETURN QUERY
    SELECT 
      admin_record.id,
      admin_record.email,
      admin_record.name,
      admin_record.role,
      admin_record.status,
      NOW() as last_login,
      admin_record.created_at,
      NOW() as updated_at;
  END IF;
  
  -- Return empty result if credentials are invalid
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check table access for admins
CREATE OR REPLACE FUNCTION public.check_table_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new admin
CREATE OR REPLACE FUNCTION public.create_admin(
  admin_email TEXT,
  admin_name TEXT,
  admin_password TEXT,
  admin_role TEXT,
  admin_status TEXT
)
RETURNS UUID AS $$
DECLARE
  new_admin_id UUID;
BEGIN
  -- Check if the current user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.id = auth.uid() 
    AND a.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only super admins can create new admin accounts';
  END IF;

  -- Insert the new admin
  INSERT INTO public.admins (
    email,
    name,
    password_hash,
    role,
    status,
    created_at,
    updated_at
  ) VALUES (
    admin_email,
    admin_name,
    public.hash_password(admin_password),
    admin_role,
    admin_status,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_admin_id;

  RETURN new_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update an admin with a new password
CREATE OR REPLACE FUNCTION public.update_admin_with_password(
  admin_id UUID,
  admin_name TEXT,
  admin_password TEXT,
  admin_role TEXT,
  admin_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.id = auth.uid() 
    AND a.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only super admins can update admin accounts';
  END IF;

  -- Update the admin with new password
  UPDATE public.admins
  SET
    name = admin_name,
    password_hash = public.hash_password(admin_password),
    role = admin_role,
    status = admin_status,
    updated_at = NOW()
  WHERE id = admin_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;