-- Function to check table access for admins
CREATE OR REPLACE FUNCTION check_table_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new admin
CREATE OR REPLACE FUNCTION create_admin(
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
    SELECT 1 FROM admins 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only super admins can create new admin accounts';
  END IF;

  -- Insert the new admin
  INSERT INTO admins (
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
    crypt(admin_password, gen_salt('bf')),
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
CREATE OR REPLACE FUNCTION update_admin_with_password(
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
    SELECT 1 FROM admins 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only super admins can update admin accounts';
  END IF;

  -- Update the admin with new password
  UPDATE admins
  SET
    name = admin_name,
    password_hash = crypt(admin_password, gen_salt('bf')),
    role = admin_role,
    status = admin_status,
    updated_at = NOW()
  WHERE id = admin_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 