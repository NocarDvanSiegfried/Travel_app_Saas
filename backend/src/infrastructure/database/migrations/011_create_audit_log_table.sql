-- Create immutable audit log table for security and compliance
-- This table stores all important actions with tamper-evident design

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of event data for integrity
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES b2b_companies(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'DATA_MODIFICATION', 'FINANCIAL', 'SECURITY', 'SYSTEM')),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    result VARCHAR(20) NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    severity VARCHAR(20) DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    details TEXT, -- JSON object with additional event details
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    location_country VARCHAR(2), -- ISO country code
    location_city VARCHAR(100),
    correlation_id VARCHAR(36), -- For tracking related events
    previous_hash VARCHAR(64), -- Previous event hash for blockchain-like integrity
    checksum VARCHAR(64) NOT NULL, -- Event integrity checksum
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log_integrity UNIQUE (id, checksum)
);

-- Create indexes for audit log queries
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_company_id ON audit_log(company_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_category ON audit_log(category);
CREATE INDEX idx_audit_log_result ON audit_log(result);
CREATE INDEX idx_audit_log_risk_score ON audit_log(risk_score DESC);
CREATE INDEX idx_audit_log_severity ON audit_log(severity);
CREATE INDEX idx_audit_log_ip_address ON audit_log(ip_address);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);
CREATE INDEX idx_audit_log_correlation_id ON audit_log(correlation_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Create composite indexes for common queries
CREATE INDEX idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_log_company_timestamp ON audit_log(company_id, timestamp DESC);
CREATE INDEX idx_audit_log_category_timestamp ON audit_log(category, timestamp DESC);
CREATE INDEX idx_audit_log_severity_timestamp ON audit_log(severity, timestamp DESC);

-- Add comments
COMMENT ON TABLE audit_log IS 'Immutable audit log for security and compliance with tamper-evident design';
COMMENT ON COLUMN audit_log.event_hash IS 'Unique hash of the event for deduplication and integrity';
COMMENT ON COLUMN audit_log.timestamp IS 'When the event occurred';
COMMENT ON COLUMN audit_log.user_id IS 'User who performed the action (if authenticated)';
COMMENT ON COLUMN audit_log.company_id IS 'Company associated with the event';
COMMENT ON COLUMN audit_log.session_id IS 'Session identifier for the event';
COMMENT ON COLUMN audit_log.action IS 'Specific action performed (e.g., LOGIN_SUCCESS, EMPLOYEE_CREATED)';
COMMENT ON COLUMN audit_log.category IS 'High-level category of the event';
COMMENT ON COLUMN audit_log.resource_type IS 'Type of resource affected (e.g., user, ticket, company)';
COMMENT ON COLUMN audit_log.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN audit_log.result IS 'Whether the action was successful or failed';
COMMENT ON COLUMN audit_log.risk_score IS 'Risk score (0-100) for security analysis';
COMMENT ON COLUMN audit_log.severity IS 'Severity level for alerting and reporting';
COMMENT ON COLUMN audit_log.details IS 'JSON object with additional event details';
COMMENT ON COLUMN audit_log.ip_address IS 'IP address from which the event originated';
COMMENT ON COLUMN audit_log.user_agent IS 'Browser/user agent string';
COMMENT ON COLUMN audit_log.device_fingerprint IS 'Device fingerprint for session tracking';
COMMENT ON COLUMN audit_log.location_country IS 'Country code derived from IP address';
COMMENT ON COLUMN audit_log.location_city IS 'City derived from IP address';
COMMENT ON COLUMN audit_log.correlation_id IS 'Correlation ID for tracking related events across sessions';
COMMENT ON COLUMN audit_log.previous_hash IS 'Hash of previous event for blockchain-like integrity verification';
COMMENT ON COLUMN audit_log.checksum IS 'Checksum for verifying event integrity';

-- Create function to calculate event hash
CREATE OR REPLACE FUNCTION calculate_event_hash(
    action VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    resource_id VARCHAR(255),
    details TEXT
)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(
        sha256(
            action::TEXT || '|' ||
            timestamp::TEXT || '|' ||
            COALESCE(user_id::TEXT, '') || '|' ||
            COALESCE(resource_id, '') || '|' ||
            COALESCE(details, '')
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate event checksum
CREATE OR REPLACE FUNCTION calculate_event_checksum(
    id UUID,
    timestamp TIMESTAMP WITH TIME ZONE,
    action VARCHAR(100),
    user_id UUID,
    company_id UUID,
    result VARCHAR(20),
    details TEXT,
    ip_address INET
)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(
        sha256(
            id::TEXT || '|' ||
            timestamp::TEXT || '|' ||
            action || '|' ||
            COALESCE(user_id::TEXT, '') || '|' ||
            COALESCE(company_id::TEXT, '') || '|' ||
            result || '|' ||
            COALESCE(details, '') || '|' ||
            ip_address::TEXT
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get previous event hash for blockchain integrity
CREATE OR REPLACE FUNCTION get_previous_event_hash()
RETURNS VARCHAR(64) AS $$
DECLARE
    previous_checksum VARCHAR(64);
BEGIN
    SELECT checksum INTO previous_checksum
    FROM audit_log
    ORDER BY timestamp DESC, id DESC
    LIMIT 1;

    RETURN COALESCE(previous_checksum, 'genesis_hash_' || encode(gen_random_bytes(16), 'hex'));
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically calculate hashes and checksums
CREATE OR REPLACE FUNCTION set_audit_log_hashes()
RETURNS TRIGGER AS $$
DECLARE
    event_hash VARCHAR(64);
    checksum VARCHAR(64);
    previous_hash VARCHAR(64);
BEGIN
    -- Calculate event hash
    SELECT calculate_event_hash(
        NEW.action,
        NEW.timestamp,
        NEW.user_id,
        NEW.resource_id,
        NEW.details
    ) INTO event_hash;

    -- Calculate checksum
    SELECT calculate_event_checksum(
        NEW.id,
        NEW.timestamp,
        NEW.action,
        NEW.user_id,
        NEW.company_id,
        NEW.result,
        NEW.details,
        NEW.ip_address
    ) INTO checksum;

    -- Get previous event hash for blockchain integrity
    SELECT get_previous_event_hash() INTO previous_hash;

    -- Set the hash fields
    NEW.event_hash := event_hash;
    NEW.checksum := checksum;
    NEW.previous_hash := previous_hash;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set hashes before insert
CREATE TRIGGER trigger_audit_log_set_hashes
    BEFORE INSERT ON audit_log
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_log_hashes();

-- Create function to verify audit log integrity
CREATE OR REPLACE FUNCTION verify_audit_log_integrity(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    event_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH integrity_check AS (
        SELECT
            al.id,
            CASE
                WHEN al.checksum != calculate_event_checksum(
                    al.id,
                    al.timestamp,
                    al.action,
                    al.user_id,
                    al.company_id,
                    al.result,
                    al.details,
                    al.ip_address
                ) THEN 'Checksum mismatch'
                WHEN al.previous_hash != COALESCE(prev.checksum, 'genesis_hash_' || encode(gen_random_bytes(16), 'hex'))
                     AND al.timestamp != (SELECT MIN(timestamp) FROM audit_log) THEN 'Chain integrity broken'
                ELSE NULL
            END AS error
        FROM audit_log al
        LEFT JOIN audit_log prev ON al.previous_hash = prev.checksum
        WHERE (start_date IS NULL OR al.timestamp >= start_date)
        AND (end_date IS NULL OR al.timestamp <= end_date)
    )
    SELECT
        ic.id as event_id,
        (ic.error IS NULL) as is_valid,
        ic.error as error_message
    FROM integrity_check ic;
END;
$$ LANGUAGE plpgsql;

-- Create view for audit log summary (without sensitive details)
CREATE OR REPLACE VIEW audit_log_summary AS
SELECT
    id,
    timestamp,
    user_id,
    company_id,
    action,
    category,
    resource_type,
    result,
    risk_score,
    severity,
    ip_address,
    location_country,
    location_city
FROM audit_log;

-- Create view for recent security events
CREATE OR REPLACE VIEW recent_security_events AS
SELECT
    id,
    timestamp,
    user_id,
    company_id,
    action,
    category,
    resource_type,
    result,
    risk_score,
    severity,
    ip_address,
    location_country,
    location_city,
    details
FROM audit_log
WHERE severity IN ('HIGH', 'CRITICAL')
    OR category = 'SECURITY'
    OR risk_score >= 70
ORDER BY timestamp DESC
LIMIT 100;

-- Create view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    user_id,
    company_id,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE result = 'FAILURE') as failed_events,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_events,
    AVG(risk_score) as avg_risk_score,
    MAX(timestamp) as last_activity,
    MIN(timestamp) as first_activity
FROM audit_log
WHERE user_id IS NOT NULL
GROUP BY user_id, company_id;

-- Grant necessary permissions
-- GRANT SELECT ON audit_log TO app_user;
-- GRANT SELECT ON audit_log_summary TO app_user;
-- GRANT SELECT ON recent_security_events TO app_user;
-- GRANT SELECT ON user_activity_summary TO app_user;
-- GRANT EXECUTE ON FUNCTION calculate_event_hash TO app_user;
-- GRANT EXECUTE ON FUNCTION calculate_event_checksum TO app_user;
-- GRANT EXECUTE ON FUNCTION get_previous_event_hash TO app_user;
-- GRANT EXECUTE ON FUNCTION verify_audit_log_integrity TO app_user;