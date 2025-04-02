-- Drop existing policies to recreate them with correct permissions
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Property owners can delete" ON storage.objects;

-- Create more permissive policies for the properties bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'properties');

CREATE POLICY "Anyone can upload to properties" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'properties');

CREATE POLICY "Anyone can update properties objects" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'properties');

CREATE POLICY "Anyone can delete properties objects" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'properties');