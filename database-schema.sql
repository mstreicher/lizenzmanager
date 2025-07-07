-- LC-Kern Database Schema for Supabase
-- This file contains the SQL commands to set up the required database tables

-- 1. Extend existing users table with VIDIS fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS vidis_pseudonym TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create anbieter_profile table for provider registration
CREATE TABLE IF NOT EXISTS anbieter_profile (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    tax_id TEXT,
    vat_id TEXT,
    specialization TEXT NOT NULL,
    website TEXT,
    description TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verification_reason TEXT,
    api_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create OIDC configuration table
CREATE TABLE IF NOT EXISTS oidc_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_name TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    discovery_url TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    scopes TEXT DEFAULT 'openid profile email',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create API access logs table
CREATE TABLE IF NOT EXISTS api_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT NOT NULL,
    user_id UUID,
    response_status INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 5. Create media_items table for licensed content
CREATE TABLE IF NOT EXISTS media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    media_url TEXT,
    preview_url TEXT,
    media_type TEXT CHECK (media_type IN ('book', 'video', 'audio', 'software', 'document', 'interactive')),
    file_size BIGINT,
    duration INTEGER, -- in seconds for media files
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create SSO sessions table
CREATE TABLE IF NOT EXISTS sso_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
    return_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE
);

-- 7. Create classes table for better organization
CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_level TEXT,
    teacher_id UUID REFERENCES users(id),
    academic_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_vidis_pseudonym ON users(vidis_pseudonym);
CREATE INDEX IF NOT EXISTS idx_anbieter_profile_user_id ON anbieter_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_anbieter_profile_verification_status ON anbieter_profile(verification_status);
CREATE INDEX IF NOT EXISTS idx_anbieter_profile_api_key ON anbieter_profile(api_key);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_timestamp ON api_access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_endpoint ON api_access_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_media_items_license_id ON media_items(license_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_token ON sso_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires_at ON sso_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);

-- 9. Row Level Security (RLS) Policies

-- Enable RLS on new tables
ALTER TABLE anbieter_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE oidc_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Anbieter profile policies
CREATE POLICY "Users can view their own anbieter profile" ON anbieter_profile
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own anbieter profile" ON anbieter_profile
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own anbieter profile" ON anbieter_profile
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all anbieter profiles" ON anbieter_profile
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins can update anbieter profiles" ON anbieter_profile
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- OIDC configs - admin only
CREATE POLICY "Only admins can manage OIDC configs" ON oidc_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- API access logs - admin only for viewing
CREATE POLICY "Admins can view API access logs" ON api_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Media items - providers can manage their own
CREATE POLICY "Providers can manage their media items" ON media_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM licenses l
            JOIN users u ON l.created_by = u.id
            WHERE l.id = media_items.license_id
            AND u.id = auth.uid()
        )
    );

-- SSO sessions - users can view their own
CREATE POLICY "Users can view their own SSO sessions" ON sso_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Classes - school-based access
CREATE POLICY "School users can view their school's classes" ON classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.school_id = classes.school_id
        )
    );

CREATE POLICY "School admins can manage their school's classes" ON classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.school_id = classes.school_id
            AND users.role IN ('schulleiter', 'admin')
        )
    );

-- 10. Insert default OIDC configuration for VIDIS
INSERT INTO oidc_configs (provider_name, client_id, client_secret, discovery_url, redirect_uri)
VALUES (
    'VIDIS',
    'lc-kern-client',
    'kCXIpvO7kVrommGAPi6RBenZCocr6fl3',
    'https://aai-test.vidis.schule/auth/realms/vidis/.well-known/openid-configuration',
    'https://localhost:5173/auth/callback'
) ON CONFLICT DO NOTHING;

-- 11. Create functions for API key generation
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
    RETURN 'lc_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to auto-generate API keys
CREATE OR REPLACE FUNCTION set_api_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.api_key IS NULL OR NEW.api_key = '' THEN
        NEW.api_key := generate_api_key();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_api_key
    BEFORE INSERT ON anbieter_profile
    FOR EACH ROW
    EXECUTE FUNCTION set_api_key();

-- 13. Create function to clean up expired SSO sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sso_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sso_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 14. Create view for license statistics
CREATE OR REPLACE VIEW license_statistics AS
SELECT 
    l.subject,
    l.type,
    COUNT(*) as total_licenses,
    COUNT(sl.id) as assigned_to_schools,
    SUM(sl.quantity) as total_quantity,
    COUNT(a.id) as total_assignments,
    COUNT(CASE WHEN a.assigned_to IS NOT NULL THEN 1 END) as used_assignments
FROM licenses l
LEFT JOIN school_licenses sl ON l.id = sl.license_id
LEFT JOIN assignments a ON sl.id = a.school_license_id
GROUP BY l.subject, l.type;

-- Grant necessary permissions
GRANT SELECT ON license_statistics TO authenticated;
