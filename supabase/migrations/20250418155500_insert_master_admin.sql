-- Insert the master admin user
-- The password 'admin@123' will be hashed using the hash_password function.
INSERT INTO admins (email, password_hash, name, status)
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

-- Ensure the admins table is part of the publication if not already
-- This might be redundant if the previous migration already did it, but ensures consistency.
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
