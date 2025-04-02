-- Create a storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'properties');

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'properties' AND auth.role() = 'authenticated');

CREATE POLICY "Property owners can update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'properties' AND auth.role() = 'authenticated');

CREATE POLICY "Property owners can delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'properties' AND auth.role() = 'authenticated');