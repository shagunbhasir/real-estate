-- Add verification status to properties table
ALTER TABLE properties
ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'not_verified',
ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0;

-- Create user_properties table to track user's listed properties
CREATE TABLE user_properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    listed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_properties_user_id ON user_properties(user_id);
CREATE INDEX idx_user_properties_property_id ON user_properties(property_id);
CREATE INDEX idx_properties_verification_status ON properties(verification_status);

-- Add RLS policies
ALTER TABLE user_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own property listings"
    ON user_properties FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all property listings"
    ON user_properties FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )); 