-- Create admin table for better admin user management
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  -- role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')), -- Removed role
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_admins_email ON admins(email);
-- CREATE INDEX idx_admins_role ON admins(role); -- Removed role index
CREATE INDEX idx_admins_status ON admins(status);

-- Enable row level security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view their own data"
  ON admins FOR SELECT
  USING (auth.uid()::text IN (
    SELECT id::text FROM admins WHERE status = 'active'
  ));

CREATE POLICY "Admins can update their own data"
  ON admins FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (status = 'active');

-- Removed "Super admins can manage all admins" policy as it depended on role
-- CREATE POLICY "Super admins can manage all admins"
--   ON admins FOR ALL
--   USING (auth.uid()::text IN (
--     SELECT id::text FROM admins WHERE role = 'super_admin' AND status = 'active'
--   ));
-- Consider adding a simpler policy if needed, e.g., allowing any active admin to manage others,
-- or restricting management based on other criteria if necessary. For now, only self-management is allowed.

-- Create function to securely hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(email TEXT, password TEXT)
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id
  FROM admins
  WHERE admins.email = email
  AND admins.status = 'active'
  AND admins.password_hash = crypt(password, admins.password_hash);
  
  -- Update last login time if found
  IF admin_id IS NOT NULL THEN
    UPDATE admins
    SET last_login = NOW(),
        updated_at = NOW()
    WHERE id = admin_id;
  END IF;
  
  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default admin (password: changeme123)
-- In production, you should change this password immediately
INSERT INTO admins (email, password_hash, name) -- Removed role from insert
VALUES ('admin@example.com', crypt('changeme123', gen_salt('bf')), 'System Admin')
ON CONFLICT (email) DO NOTHING;

-- Enable realtime for admins table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;

-- Create or update function to get admin by email and password
CREATE OR REPLACE FUNCTION get_admin_by_credentials(admin_email TEXT, admin_password TEXT)
RETURNS TABLE (
  id UUID,
  id UUID,
  email TEXT,
  name TEXT
  -- role TEXT -- Removed role from return type
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.email, a.name -- Added name to select, removed role
  FROM admins a
  WHERE a.email = admin_email
  AND a.password_hash = crypt(admin_password, a.password_hash)
  AND a.status = 'active';
  
  -- Update last login time
  UPDATE admins
  SET last_login = NOW(),
      updated_at = NOW()
  WHERE email = admin_email
  AND status = 'active'
  AND password_hash = crypt(admin_password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
