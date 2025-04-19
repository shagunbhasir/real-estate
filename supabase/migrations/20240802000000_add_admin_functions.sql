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
  -- admin_role TEXT, -- Removed role
  admin_status TEXT
)
RETURNS UUID AS $$
DECLARE
  new_admin_id UUID;
BEGIN
  -- Check if the current user is an admin (simplified check without role)
  IF NOT EXISTS (
    SELECT 1 FROM admins 
    WHERE id = auth.uid() 
    -- AND role = 'super_admin' -- Removed role check
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active admins can create new admin accounts'; -- Adjusted message
  END IF;

  -- Insert the new admin
  INSERT INTO admins (
    email,
    name,
    password_hash,
    -- role, -- Removed role
    status,
    created_at,
    updated_at
  ) VALUES (
    admin_email,
    admin_name,
    crypt(admin_password, gen_salt('bf')),
    -- admin_role, -- Removed role
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
  -- admin_role TEXT, -- Removed role
  admin_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user is an admin (simplified check without role)
  IF NOT EXISTS (
    SELECT 1 FROM admins 
    WHERE id = auth.uid() 
    -- AND role = 'super_admin' -- Removed role check
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active admins can update admin accounts'; -- Adjusted message
  END IF;

  -- Update the admin with new password
  UPDATE admins
  SET
    name = admin_name,
    password_hash = crypt(admin_password, gen_salt('bf')),
    -- role = admin_role, -- Removed role
    status = admin_status,
    updated_at = NOW()
  WHERE id = admin_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
