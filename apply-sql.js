import pg from 'pg';
const { Pool } = pg;

// Connection string provided by the user
const connectionString = 'postgresql://postgres:Mjmzmsk@26@db.xihdsxmekghxyksqgffb.supabase.co:5432/postgres';

// Combined and improved SQL content
const sqlContent = `
-- Combined SQL from 20240801... and 20240802... migrations (role removed)

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Ensure uuid-ossp extension is available (for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table if it doesn't exist (dependency for properties)
-- Note: Assuming a basic users table structure. Adjust if needed.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    full_name TEXT,
    -- Add other relevant user fields here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for users table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = 't') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies for users table to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users; -- Remove admin-specific policy

-- Create policies for users table
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id); -- Authenticated users can select their own record

-- Allow authenticated users to view basic info of any user (adjust if too permissive)
-- Alternatively, remove this if only admins should see other users (via RPC)
DROP POLICY IF EXISTS "Authenticated users can view basic user info" ON users; -- Add this line
CREATE POLICY "Authenticated users can view basic user info"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Note: Add INSERT/UPDATE/DELETE policies for users if needed later (e.g., users update own profile).

-- Create properties table if it doesn't exist (from 20240723 migration)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  price NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'rent')),
  beds INTEGER, -- Made nullable, adjust if needed
  baths INTEGER, -- Made nullable, adjust if needed
  sqft INTEGER,  -- Made nullable, adjust if needed
  imageUrl TEXT,
  images TEXT[], -- Added images array field
  mobile_number TEXT, -- Added mobile number field
  verification_status BOOLEAN DEFAULT FALSE, -- Added verification status
  views_count INTEGER DEFAULT 0, -- Added views count
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Add latitude and longitude if needed:
  -- latitude NUMERIC,
  -- longitude NUMERIC
);

-- Add missing columns to properties table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'images') THEN
    ALTER TABLE public.properties ADD COLUMN images TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'mobile_number') THEN
    ALTER TABLE public.properties ADD COLUMN mobile_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'verification_status') THEN
    ALTER TABLE public.properties ADD COLUMN verification_status BOOLEAN DEFAULT FALSE;
  END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'views_count') THEN
    ALTER TABLE public.properties ADD COLUMN views_count INTEGER DEFAULT 0;
  END IF;
  -- Make beds, baths, sqft nullable if they exist and are NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'beds' AND is_nullable = 'NO') THEN
    ALTER TABLE public.properties ALTER COLUMN beds DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'baths' AND is_nullable = 'NO') THEN
    ALTER TABLE public.properties ALTER COLUMN baths DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'sqft' AND is_nullable = 'NO') THEN
    ALTER TABLE public.properties ALTER COLUMN sqft DROP NOT NULL;
  END IF;
END $$;

-- Enable RLS for properties table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties' AND rowsecurity = 't') THEN
    ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop and recreate policies for properties table (from 20240723 migration)
DROP POLICY IF EXISTS "Users can view all properties" ON properties;
CREATE POLICY "Users can view all properties"
  ON properties FOR SELECT
  USING (true); -- Allows anyone (logged in or anon) to view properties

DROP POLICY IF EXISTS "Users can insert their own properties" ON properties;
CREATE POLICY "Users can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = user_id); -- Only authenticated users can insert for themselves

DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
CREATE POLICY "Users can update their own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id); -- Only authenticated users can update their own

DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;
CREATE POLICY "Users can delete their own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id); -- Only authenticated users can delete their own

-- Remove the complex admin update policy for properties
DROP POLICY IF EXISTS "Admins can update any property" ON properties;

-- Note: Admins will update properties via SECURITY DEFINER RPC functions, not direct table access.
-- The "Users can update their own properties" policy remains.

-- Add properties table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
END $$;


-- Create admin table if it doesn't exist (structure without role)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist, handling NOT NULL constraints safely
DO $$
DECLARE
  temp_default_password_hash TEXT := crypt('__TEMP_DEFAULT_PW__', gen_salt('bf'));
  temp_default_email TEXT;
  temp_default_name TEXT := '__TEMP_DEFAULT_NAME__';
  temp_default_status TEXT := 'active'; -- Assuming 'active' is a safe default
BEGIN
  -- Add email column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'email') THEN
    ALTER TABLE public.admins ADD COLUMN email TEXT;
    -- Generate a unique temporary default email
    temp_default_email := '__TEMP_' || uuid_generate_v4()::text || '@example.com';
    ALTER TABLE public.admins ALTER COLUMN email SET DEFAULT temp_default_email;
    UPDATE public.admins SET email = temp_default_email WHERE email IS NULL;
    ALTER TABLE public.admins ALTER COLUMN email SET NOT NULL;
    ALTER TABLE public.admins ALTER COLUMN email DROP DEFAULT;
    ALTER TABLE public.admins ADD CONSTRAINT admins_email_key UNIQUE (email);
  END IF;

  -- Add password_hash column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'password_hash') THEN
    ALTER TABLE public.admins ADD COLUMN password_hash TEXT;
    ALTER TABLE public.admins ALTER COLUMN password_hash SET DEFAULT temp_default_password_hash;
    UPDATE public.admins SET password_hash = temp_default_password_hash WHERE password_hash IS NULL;
    ALTER TABLE public.admins ALTER COLUMN password_hash SET NOT NULL;
    ALTER TABLE public.admins ALTER COLUMN password_hash DROP DEFAULT;
  END IF;

  -- Add name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'name') THEN
    ALTER TABLE public.admins ADD COLUMN name TEXT;
    ALTER TABLE public.admins ALTER COLUMN name SET DEFAULT temp_default_name;
    UPDATE public.admins SET name = temp_default_name WHERE name IS NULL;
    ALTER TABLE public.admins ALTER COLUMN name SET NOT NULL;
    ALTER TABLE public.admins ALTER COLUMN name DROP DEFAULT;
  END IF;

  -- Add status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'status') THEN
    ALTER TABLE public.admins ADD COLUMN status TEXT;
    ALTER TABLE public.admins ALTER COLUMN status SET DEFAULT temp_default_status;
    UPDATE public.admins SET status = temp_default_status WHERE status IS NULL;
    ALTER TABLE public.admins ALTER COLUMN status SET NOT NULL;
    -- Keep the default for new rows if desired, or drop it:
    -- ALTER TABLE public.admins ALTER COLUMN status DROP DEFAULT;
    -- Add check constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage where table_name = 'admins' and column_name = 'status' and constraint_name = 'admins_status_check') THEN
       ALTER TABLE public.admins ADD CONSTRAINT admins_status_check CHECK (status IN ('active', 'inactive'));
    END IF;
  END IF;

   -- Add last_login column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'last_login') THEN
    ALTER TABLE admins ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'created_at') THEN
    ALTER TABLE admins ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'updated_at') THEN
    ALTER TABLE admins ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  -- Explicitly drop the role column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admins' AND column_name = 'role') THEN
    ALTER TABLE admins DROP COLUMN role;
  END IF;
END $$;


-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
-- Drop role index if it exists
DROP INDEX IF EXISTS idx_admins_role;

-- Enable row level security if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admins' AND rowsecurity = 't') THEN
    ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies before creating new ones to avoid errors
DROP POLICY IF EXISTS "Admins can view their own data" ON admins;
DROP POLICY IF EXISTS "Admins can update their own data" ON admins;
DROP POLICY IF EXISTS "Super admins can manage all admins" ON admins; -- Ensure old policy is dropped

-- Create policies for admin access (without role dependency)
-- Corrected SELECT policy to avoid recursion
CREATE POLICY "Admins can view their own data"
  ON admins FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = id AND status = 'active'); -- Check directly against the row's id and status

CREATE POLICY "Admins can update their own data"
  ON admins FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = id) -- Ensure auth.uid() is not null
  WITH CHECK (status = 'active');

-- Drop existing functions before creating new ones to avoid signature conflicts
DROP FUNCTION IF EXISTS hash_password(text);
DROP FUNCTION IF EXISTS verify_password(text, text);
DROP FUNCTION IF EXISTS get_admin_by_credentials(text, text);
DROP FUNCTION IF EXISTS check_table_access();
DROP FUNCTION IF EXISTS create_admin(text, text, text, text);
DROP FUNCTION IF EXISTS update_admin_with_password(uuid, text, text, text);

-- Create function to securely hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify passwords (without role)
CREATE OR REPLACE FUNCTION verify_password(p_email TEXT, p_password TEXT)
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id
  FROM public.admins
  WHERE email = p_email
  AND status = 'active'
  AND password_hash = crypt(p_password, password_hash);

  -- Update last login time if found
  IF admin_id IS NOT NULL THEN
    UPDATE public.admins
    SET last_login = NOW(),
        updated_at = NOW()
    WHERE id = admin_id;
  END IF;

  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default admin (password: changeme123) - without role
INSERT INTO public.admins (email, password_hash, name, status)
VALUES ('admin@example.com', crypt('changeme123', gen_salt('bf')), 'System Admin', 'active')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name, -- Update name in case it changed
  password_hash = CASE -- Only update password if it's different (or if you want to force reset)
                    WHEN admins.password_hash != crypt('changeme123', gen_salt('bf')) THEN crypt('changeme123', gen_salt('bf'))
                    ELSE admins.password_hash
                  END,
  status = 'active'; -- Ensure status is active

-- Enable realtime for admins table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;
  END IF;
END $$;

-- Create or update function to get admin by email and password (without role)
CREATE OR REPLACE FUNCTION get_admin_by_credentials(admin_email TEXT, admin_password TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT
) AS $$
DECLARE
    found_admin_id UUID;
BEGIN
  -- First, verify credentials and get the ID using the verify_password function
  found_admin_id := verify_password(admin_email, admin_password);

  -- If an admin was found (verify_password returns non-null UUID), return their info
  IF found_admin_id IS NOT NULL THEN
    RETURN QUERY
    SELECT a.id, a.email, a.name
    FROM public.admins a
    WHERE a.id = found_admin_id;
  END IF;

  -- If no admin found, return empty set
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to check table access for admins (simple version)
CREATE OR REPLACE FUNCTION check_table_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE; -- Or implement actual logic if needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new admin (without role)
CREATE OR REPLACE FUNCTION create_admin(
  p_admin_email TEXT,
  p_admin_name TEXT,
  p_admin_password TEXT,
  p_admin_status TEXT
)
RETURNS UUID AS $$
DECLARE
  new_admin_id UUID;
  requesting_admin_id UUID;
BEGIN
  -- Attempt to get the requesting user's ID from auth context
  requesting_admin_id := auth.uid();

  -- Check if the current user is an active admin (or handle null auth.uid if needed)
  IF requesting_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = requesting_admin_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active admins can create new admin accounts';
  END IF;

  -- Insert the new admin
  INSERT INTO public.admins (
    email,
    name,
    password_hash,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_admin_email,
    p_admin_name,
    crypt(p_admin_password, gen_salt('bf')),
    p_admin_status,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_admin_id;

  RETURN new_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update an admin with a new password (without role)
CREATE OR REPLACE FUNCTION update_admin_with_password(
  p_admin_id UUID,
  p_admin_name TEXT,
  p_admin_password TEXT,
  p_admin_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  requesting_admin_id UUID;
BEGIN
  -- Attempt to get the requesting user's ID from auth context
  requesting_admin_id := auth.uid();

  -- Check if the current user is an active admin (or handle null auth.uid if needed)
  IF requesting_admin_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = requesting_admin_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active admins can update admin accounts';
  END IF;

  -- Update the admin
  UPDATE public.admins
  SET
    name = p_admin_name,
    password_hash = crypt(p_admin_password, gen_salt('bf')),
    status = p_admin_status,
    updated_at = NOW()
  WHERE id = p_admin_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admins to update property verification status
-- SECURITY DEFINER allows it to bypass RLS for the UPDATE operation itself.
-- We rely on frontend route protection (AdminRoute) to ensure only admins call this.
CREATE OR REPLACE FUNCTION update_property_verification(
  p_property_id UUID,
  p_new_status BOOLEAN
)
RETURNS VOID AS $$
-- We could add an explicit check here to ensure the caller is an admin if needed,
-- e.g., by requiring an admin token/ID as an argument and verifying it.
-- For now, assuming frontend route protection is sufficient.
BEGIN
  UPDATE public.properties
  SET
    verification_status = p_new_status,
    updated_at = NOW()
  WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to the authenticated role
-- Granting to 'service_role' might be safer if only backend calls it,
-- but 'authenticated' works if called from frontend by a logged-in user (admin or regular).
-- Let's stick with 'authenticated' for now, assuming admin calls it from frontend.
GRANT EXECUTE ON FUNCTION public.update_property_verification(uuid, boolean) TO authenticated;


-- Helper function to check if a given UUID is an active admin
CREATE OR REPLACE FUNCTION is_active_admin(p_admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admins
    WHERE id = p_admin_id AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.is_active_admin(uuid) TO authenticated;


-- Function for admins to get all properties with owner details
DROP FUNCTION IF EXISTS admin_get_all_properties_with_owners(uuid);
CREATE OR REPLACE FUNCTION admin_get_all_properties_with_owners(p_requesting_admin_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  address TEXT,
  price NUMERIC,
  type TEXT,
  beds INTEGER,
  baths INTEGER,
  sqft INTEGER,
  imageUrl TEXT,
  images TEXT[],
  mobile_number TEXT,
  verification_status BOOLEAN,
  views_count INTEGER,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  owner_name TEXT, -- Added from users table
  owner_email TEXT -- Added from users table
) AS $$
BEGIN
  -- Verify the requesting user is an active admin
  IF NOT is_active_admin(p_requesting_admin_id) THEN
    RAISE EXCEPTION 'Permission denied: User is not an active admin.';
  END IF;

  -- Return all properties joined with user details
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.description,
    p.address,
    p.price,
    p.type,
    p.beds,
    p.baths,
    p.sqft,
    p.imageUrl,
    p.images,
    p.mobile_number::TEXT, -- Explicitly cast to TEXT
    p.verification_status,
    p.views_count::INTEGER, -- Explicitly cast to INTEGER
    p.user_id,
    p.created_at,
    p.updated_at,
    u.full_name AS owner_name,
    u.email AS owner_email
  FROM public.properties p
  LEFT JOIN public.users u ON p.user_id = u.id -- Use LEFT JOIN in case user is deleted
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_get_all_properties_with_owners(uuid) TO authenticated;


-- Function for admins to update any property
DROP FUNCTION IF EXISTS admin_update_property(uuid, uuid, jsonb);
CREATE OR REPLACE FUNCTION admin_update_property(
  p_requesting_admin_id UUID,
  p_property_id UUID,
  p_property_data JSONB -- Use JSONB for flexibility
)
RETURNS BOOLEAN AS $$
DECLARE
  update_query TEXT;
  set_clauses TEXT[];
  key TEXT;
  value JSONB;
BEGIN
  -- Verify the requesting user is an active admin
  IF NOT is_active_admin(p_requesting_admin_id) THEN
    RAISE EXCEPTION 'Permission denied: User is not an active admin.';
  END IF;

  -- Dynamically build the SET clause from the JSONB input
  -- Exclude 'id', 'user_id', 'created_at', 'updated_at' from direct update
  FOR key, value IN SELECT * FROM jsonb_each(p_property_data)
  LOOP
    IF key NOT IN ('id', 'user_id', 'created_at', 'updated_at') THEN
       -- Ensure proper quoting for values, especially strings
       set_clauses := array_append(set_clauses, format('%I = %L', key, value #>> '{}')); -- Use %I for identifier, %L for literal
    END IF;
  END LOOP;

  -- Always update the 'updated_at' timestamp
  set_clauses := array_append(set_clauses, format('updated_at = %L', NOW()::text));

  IF array_length(set_clauses, 1) IS NULL THEN
    RAISE EXCEPTION 'No valid fields provided for update.';
  END IF;

  -- Construct the final UPDATE statement
  update_query := format(
    'UPDATE public.properties SET %s WHERE id = %L',
    array_to_string(set_clauses, ', '),
    p_property_id
  );

  -- Execute the dynamic query
  EXECUTE update_query;

  RETURN FOUND; -- Returns true if a row was updated, false otherwise
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_update_property(uuid, uuid, jsonb) TO authenticated;


-- Function for admins to delete any property
DROP FUNCTION IF EXISTS admin_delete_property(uuid, uuid);
CREATE OR REPLACE FUNCTION admin_delete_property(
  p_requesting_admin_id UUID,
  p_property_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify the requesting user is an active admin
  IF NOT is_active_admin(p_requesting_admin_id) THEN
    RAISE EXCEPTION 'Permission denied: User is not an active admin.';
  END IF;

  -- Delete the property
  DELETE FROM public.properties
  WHERE id = p_property_id;

  RETURN FOUND; -- Returns true if a row was deleted, false otherwise
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_delete_property(uuid, uuid) TO authenticated;


-- Insert the master admin user from 20250418155500_insert_master_admin.sql
-- The password 'admin@123' will be hashed using the hash_password function.
INSERT INTO public.admins (email, password_hash, name, status)
VALUES (
    'master.loanchacha@gmail.com',
    hash_password('admin@123'), -- Use the hash_password function
    'Master Admin',
    'active'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = excluded.password_hash, -- Update password if email exists
    name = excluded.name,
    status = excluded.status,
    updated_at = NOW();

-- Ensure the admins table is part of the publication if not already (redundant check is fine)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admins;
  END IF;
END $$;
`;

const pool = new Pool({
  connectionString: connectionString,
});

async function applySql() {
  console.log('Connecting to database and applying combined SQL...');
  const client = await pool.connect();
  try {
    console.log('Connected successfully. Executing combined SQL block...');
    // Execute the entire SQL content as a single block
    await client.query(sqlContent);
    console.log('Combined SQL applied successfully.');

  } catch (err) {
    console.error('Error applying combined SQL:', err);
    // No explicit rollback needed here as we didn't start a transaction manually
  } finally {
    client.release();
    await pool.end();
    console.log('Database connection closed.');
  }
}

applySql();
