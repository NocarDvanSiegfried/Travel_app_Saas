-- Create secure sessions table with enhanced security features
-- This table stores session data with integrity checks and security monitoring

CREATE TABLE IF NOT EXISTS secure_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(128) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES b2b_users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    access_token VARCHAR(512) NOT NULL,
    refresh_token VARCHAR(512) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(64) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('web', 'mobile', 'api')),
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    two_factor_verified BOOLEAN DEFAULT false,
    two_factor_verified_at TIMESTAMP WITH TIME ZONE,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(100),
    is_trusted_device BOOLEAN DEFAULT false,
    security_flags JSONB DEFAULT '{}', -- Store security-related flags as JSON
    login_method VARCHAR(50) DEFAULT 'password' CHECK (login_method IN ('password', 'sso', 'api_key')),
    mfa_method VARCHAR(50) CHECK (mfa_method IN ('totp', 'sms', 'hardware_key', 'none')),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    session_checksum VARCHAR(64) NOT NULL, -- For integrity verification
    CONSTRAINT secure_sessions_non_overlapping UNIQUE (user_id, device_fingerprint)
);

-- Create indexes for session management and security
CREATE INDEX idx_secure_sessions_session_id ON secure_sessions(session_id);
CREATE INDEX idx_secure_sessions_user_id ON secure_sessions(user_id);
CREATE INDEX idx_secure_sessions_company_id ON secure_sessions(company_id);
CREATE INDEX idx_secure_sessions_access_token ON secure_sessions(access_token);
CREATE INDEX idx_secure_sessions_refresh_token ON secure_sessions(refresh_token);
CREATE INDEX idx_secure_sessions_expires_at ON secure_sessions(expires_at);
CREATE INDEX idx_secure_sessions_last_activity ON secure_sessions(last_activity DESC);
CREATE INDEX idx_secure_sessions_is_revoked ON secure_sessions(is_revoked);
CREATE INDEX idx_secure_sessions_ip_address ON secure_sessions(ip_address);
CREATE INDEX idx_secure_sessions_device_fingerprint ON secure_sessions(device_fingerprint);
CREATE INDEX idx_secure_sessions_risk_score ON secure_sessions(risk_score DESC);
CREATE INDEX idx_secure_sessions_two_factor_verified ON secure_sessions(two_factor_verified);

-- Create composite indexes for common queries
CREATE INDEX idx_secure_sessions_user_active ON secure_sessions(user_id, is_revoked, expires_at);
CREATE INDEX idx_secure_sessions_device_type ON secure_sessions(device_type, created_at DESC);
CREATE INDEX idx_secure_sessions_security_risk ON secure_sessions(risk_score, last_activity DESC);

-- Add comments
COMMENT ON TABLE secure_sessions IS 'Secure session management with enhanced security features and monitoring';
COMMENT ON COLUMN secure_sessions.session_id IS 'Unique session identifier';
COMMENT ON COLUMN secure_sessions.user_id IS 'User who owns the session';
COMMENT ON COLUMN secure_sessions.company_id IS 'Company associated with the session';
COMMENT ON COLUMN secure_sessions.access_token IS 'JWT access token for API access';
COMMENT ON COLUMN secure_sessions.refresh_token IS 'Refresh token for session renewal';
COMMENT ON COLUMN secure_sessions.ip_address IS 'IP address where session was created';
COMMENT ON COLUMN secure_sessions.user_agent IS 'Browser/user agent string';
COMMENT ON COLUMN secure_sessions.device_fingerprint IS 'Unique device fingerprint for security';
COMMENT ON COLUMN secure_sessions.device_type IS 'Type of device (web, mobile, api)';
COMMENT ON COLUMN secure_sessions.location_country IS 'Country code derived from IP address';
COMMENT ON COLUMN secure_sessions.location_city IS 'City derived from IP address';
COMMENT ON COLUMN secure_sessions.last_activity IS 'Last activity timestamp for session timeout';
COMMENT ON COLUMN secure_sessions.created_at IS 'When the session was created';
COMMENT ON COLUMN secure_sessions.expires_at IS 'When the session expires';
COMMENT ON COLUMN secure_sessions.two_factor_verified IS 'Whether 2FA has been verified for this session';
COMMENT ON COLUMN secure_sessions.two_factor_verified_at IS 'When 2FA was verified';
COMMENT ON COLUMN secure_sessions.is_revoked IS 'Whether the session has been revoked';
COMMENT ON COLUMN secure_sessions.revoked_at IS 'When the session was revoked';
COMMENT ON COLUMN secure_sessions.revoked_reason IS 'Reason for session revocation';
COMMENT ON COLUMN secure_sessions.is_trusted_device IS 'Whether this is a trusted device';
COMMENT ON COLUMN secure_sessions.security_flags IS 'JSON object storing security-related flags and metadata';
COMMENT ON COLUMN secure_sessions.login_method IS 'How the user authenticated (password, sso, api_key)';
COMMENT ON COLUMN secure_sessions.mfa_method IS 'Multi-factor authentication method used';
COMMENT ON COLUMN secure_sessions.risk_score IS 'Risk score for the session (0-100)';
COMMENT ON COLUMN secure_sessions.session_checksum IS 'Checksum for verifying session integrity';

-- Create function to generate device fingerprint
CREATE OR REPLACE FUNCTION generate_device_fingerprint(
    user_agent TEXT,
    ip_address INET,
    additional_data TEXT DEFAULT NULL
)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(
        sha256(
            COALESCE(user_agent, '') || '|' ||
            ip_address::TEXT || '|' ||
            COALESCE(additional_data, '')
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate session checksum
CREATE OR REPLACE FUNCTION calculate_session_checksum(
    session_id VARCHAR(128),
    user_id UUID,
    access_token VARCHAR(512),
    refresh_token VARCHAR(512),
    ip_address INET,
    device_fingerprint VARCHAR(64)
)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(
        sha256(
            session_id || '|' ||
            user_id::TEXT || '|' ||
            access_token || '|' ||
            refresh_token || '|' ||
            ip_address::TEXT || '|' ||
            device_fingerprint
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate session risk score
CREATE OR REPLACE FUNCTION calculate_session_risk(
    ip_address INET,
    user_agent TEXT,
    user_id UUID,
    location_country VARCHAR(2)
)
RETURNS INTEGER AS $$
DECLARE
    risk_score INTEGER := 0;
    recent_sessions_count INTEGER;
    unique_countries_count INTEGER;
    avg_session_duration INTERVAL;
BEGIN
    -- Check for multiple recent sessions from different IPs
    SELECT COUNT(DISTINCT ip_address) INTO recent_sessions_count
    FROM secure_sessions
    WHERE user_id = calculate_session_risk.user_id
    AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour';

    IF recent_sessions_count > 3 THEN
        risk_score := risk_score + 25;
    END IF;

    -- Check for sessions from unusual countries
    SELECT COUNT(DISTINCT location_country) INTO unique_countries_count
    FROM secure_sessions
    WHERE user_id = calculate_session_risk.user_id
    AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours';

    IF unique_countries_count > 2 THEN
        risk_score := risk_score + 20;
    END IF;

    -- Check for suspicious user agents
    IF user_agent LIKE '%bot%' OR user_agent LIKE '%crawler%' OR user_agent LIKE '%scanner%' THEN
        risk_score := risk_score + 30;
    END IF;

    -- Check for private/internal IP addresses
    IF ip_address <<= '192.168.0.0/16' OR ip_address <<= '10.0.0.0/8' OR ip_address <<= '172.16.0.0/12' THEN
        risk_score := risk_score + 10;
    END IF;

    -- Check for known suspicious IP ranges (example)
    IF ip_address <<= '0.0.0.0/8' OR ip_address <<= '169.254.0.0/16' THEN
        risk_score := risk_score + 40;
    END IF;

    RETURN LEAST(100, risk_score);
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to set session metadata
CREATE OR REPLACE FUNCTION set_secure_session_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate device fingerprint if not provided
    IF NEW.device_fingerprint IS NULL THEN
        NEW.device_fingerprint := generate_device_fingerprint(NEW.user_agent, NEW.ip_address);
    END IF;

    -- Detect device type if not specified
    IF NEW.device_type IS NULL THEN
        IF NEW.user_agent IS NULL THEN
            NEW.device_type := 'api';
        ELSIF NEW.user_agent LIKE '%Mobile%' OR NEW.user_agent LIKE '%Android%' OR NEW.user_agent LIKE '%iPhone%' THEN
            NEW.device_type := 'mobile';
        ELSE
            NEW.device_type := 'web';
        END IF;
    END IF;

    -- Set default security flags if empty
    IF NEW.security_flags IS NULL OR NEW.security_flags = '{}' THEN
        NEW.security_flags := jsonb_build_object(
            'ip_changed', false,
            'device_changed', false,
            'suspicious_location', false
        );
    END IF;

    -- Calculate risk score if not provided
    IF NEW.risk_score IS NULL OR NEW.risk_score = 0 THEN
        NEW.risk_score := calculate_session_risk(NEW.ip_address, NEW.user_agent, NEW.user_id, NEW.location_country);
    END IF;

    -- Calculate session checksum
    NEW.session_checksum := calculate_session_checksum(
        NEW.session_id,
        NEW.user_id,
        NEW.access_token,
        NEW.refresh_token,
        NEW.ip_address,
        NEW.device_fingerprint
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set session metadata
CREATE TRIGGER trigger_set_secure_session_metadata
    BEFORE INSERT ON secure_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_secure_session_metadata();

-- Create trigger to update last activity and checksum on update
CREATE TRIGGER trigger_update_secure_session_activity
    BEFORE UPDATE ON secure_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity_and_checksum();

-- Create function to update last activity and recalculate checksum
CREATE OR REPLACE FUNCTION update_last_activity_and_checksum()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last activity if session is active
    IF NEW.is_revoked = false AND NEW.expires_at > CURRENT_TIMESTAMP THEN
        NEW.last_activity := CURRENT_TIMESTAMP;
    END IF;

    -- Recalculate checksum if essential fields changed
    IF OLD.access_token != NEW.access_token OR
       OLD.ip_address != NEW.ip_address OR
       OLD.device_fingerprint != NEW.device_fingerprint THEN
        NEW.session_checksum := calculate_session_checksum(
            NEW.session_id,
            NEW.user_id,
            NEW.access_token,
            NEW.refresh_token,
            NEW.ip_address,
            NEW.device_fingerprint
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to revoke all user sessions
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
    p_user_id UUID,
    p_reason VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE secure_sessions
    SET is_revoked = true,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = p_reason
    WHERE user_id = p_user_id
    AND is_revoked = false;

    GET DIAGNOSTICS revoked_count = ROW_COUNT;

    RETURN revoked_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to revoke expired sessions
CREATE OR REPLACE FUNCTION revoke_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE secure_sessions
    SET is_revoked = true,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = 'expired'
    WHERE expires_at <= CURRENT_TIMESTAMP
    AND is_revoked = false;

    GET DIAGNOSTICS revoked_count = ROW_COUNT;

    RETURN revoked_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old revoked sessions
CREATE OR REPLACE FUNCTION cleanup_old_revoked_sessions(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM secure_sessions
    WHERE is_revoked = true
    AND revoked_at <= CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT
    id,
    session_id,
    user_id,
    company_id,
    ip_address,
    device_type,
    device_fingerprint,
    location_country,
    location_city,
    last_activity,
    expires_at,
    two_factor_verified,
    is_trusted_device,
    risk_score,
    security_flags,
    mfa_method
FROM secure_sessions
WHERE is_revoked = false
    AND expires_at > CURRENT_TIMESTAMP;

-- Create view for session security summary
CREATE OR REPLACE VIEW session_security_summary AS
SELECT
    company_id,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE is_revoked = false AND expires_at > CURRENT_TIMESTAMP) as active_sessions,
    COUNT(*) FILTER (WHERE two_factor_verified = true) as mfa_sessions,
    COUNT(*) FILTER (WHERE is_trusted_device = true) as trusted_sessions,
    AVG(risk_score) as avg_risk_score,
    COUNT(*) FILTER (WHERE risk_score >= 70) as high_risk_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT device_fingerprint) as unique_devices,
    MAX(last_activity) as last_activity
FROM secure_sessions
GROUP BY company_id;

-- Create view for suspicious sessions
CREATE OR REPLACE VIEW suspicious_sessions AS
SELECT
    id,
    session_id,
    user_id,
    company_id,
    ip_address,
    device_type,
    risk_score,
    security_flags,
    last_activity,
    created_at
FROM secure_sessions
WHERE (risk_score >= 70 OR security_flags ? 'suspicious_location' OR security_flags ? 'ip_changed')
    AND is_revoked = false
    AND expires_at > CURRENT_TIMESTAMP
ORDER BY risk_score DESC, last_activity DESC;

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON secure_sessions TO app_user;
-- GRANT SELECT ON active_sessions TO app_user;
-- GRANT SELECT ON session_security_summary TO app_user;
-- GRANT SELECT ON suspicious_sessions TO app_user;
-- GRANT EXECUTE ON FUNCTION generate_device_fingerprint TO app_user;
-- GRANT EXECUTE ON FUNCTION calculate_session_checksum TO app_user;
-- GRANT EXECUTE ON FUNCTION calculate_session_risk TO app_user;
-- GRANT EXECUTE ON FUNCTION revoke_all_user_sessions TO app_user;
-- GRANT EXECUTE ON FUNCTION revoke_expired_sessions TO app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_old_revoked_sessions TO app_user;