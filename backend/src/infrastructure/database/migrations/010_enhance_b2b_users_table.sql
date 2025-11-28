-- Enhanced B2B users table with new roles and security features
-- This migration adds support for new roles and security features

-- Add new role types to the check constraint
ALTER TABLE b2b_users DROP CONSTRAINT b2b_users_role_check;

-- Add new columns for enhanced security
ALTER TABLE b2b_users
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN two_factor_secret VARCHAR(255), -- Encrypted TOTP secret
ADD COLUMN two_factor_backup_codes TEXT, -- JSON array of backup codes (encrypted)
ADD COLUMN two_factor_method VARCHAR(20) DEFAULT 'totp' CHECK (two_factor_method IN ('totp', 'sms', 'both')),
ADD COLUMN phone_verified BOOLEAN DEFAULT false,
ADD COLUMN last_security_check TIMESTAMP WITH TIME ZONE,
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN security_questions TEXT, -- JSON array of security questions and answers (encrypted)
ADD COLUMN device_trusted BOOLEAN DEFAULT false,
ADD COLUMN consent_given_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN gdpr_consent_version INTEGER DEFAULT 1,
ADD COLUMN data_retention_days INTEGER DEFAULT 2555; -- 7 years default

-- Update role check constraint to include new roles
ALTER TABLE b2b_users
ADD CONSTRAINT b2b_users_role_check
CHECK (role IN ('super_admin', 'company_admin', 'department_manager', 'accountant', 'booking_agent', 'employee', 'captain'));

-- Add new indexes for security features
CREATE INDEX idx_b2b_users_two_factor_enabled ON b2b_users(two_factor_enabled);
CREATE INDEX idx_b2b_users_phone_verified ON b2b_users(phone_verified);
CREATE INDEX idx_b2b_users_failed_login_attempts ON b2b_users(failed_login_attempts);
CREATE INDEX idx_b2b_users_account_locked_until ON b2b_users(account_locked_until);
CREATE INDEX idx_b2b_users_last_security_check ON b2b_users(last_security_check);

-- Add comments for new columns
COMMENT ON COLUMN b2b_users.two_factor_enabled IS 'Whether two-factor authentication is enabled for the user';
COMMENT ON COLUMN b2b_users.two_factor_secret IS 'Encrypted TOTP secret for 2FA';
COMMENT ON COLUMN b2b_users.two_factor_backup_codes IS 'Encrypted backup codes for 2FA recovery';
COMMENT ON COLUMN b2b_users.two_factor_method IS 'Preferred 2FA method (totp, sms, both)';
COMMENT ON COLUMN b2b_users.phone_verified IS 'Whether the phone number has been verified';
COMMENT ON COLUMN b2b_users.last_security_check IS 'Timestamp of last security review';
COMMENT ON COLUMN b2b_users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN b2b_users.account_locked_until IS 'Account locked until this timestamp after too many failed attempts';
COMMENT ON COLUMN b2b_users.security_questions IS 'Encrypted security questions and answers';
COMMENT ON COLUMN b2b_users.device_trusted IS 'Whether the current device is trusted for login';
COMMENT ON COLUMN b2b_users.consent_given_at IS 'Timestamp when user gave consent for data processing';
COMMENT ON COLUMN b2b_users.gdpr_consent_version IS 'Version of GDPR consent agreement';
COMMENT ON COLUMN b2b_users.data_retention_days IS 'Number of days to retain user data (GDPR compliance)';

-- Create function to check if user account is locked
CREATE OR REPLACE FUNCTION is_user_account_locked(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM b2b_users
        WHERE id = user_id
        AND account_locked_until > CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to lock user account
CREATE OR REPLACE FUNCTION lock_user_account(user_id UUID, lock_duration_minutes INTEGER DEFAULT 30)
RETURNS VOID AS $$
BEGIN
    UPDATE b2b_users
    SET account_locked_until = CURRENT_TIMESTAMP + (lock_duration_minutes || ' minutes')::INTERVAL
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment failed login attempts
CREATE OR REPLACE FUNCTION increment_failed_login_attempts(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    current_attempts INTEGER;
    max_attempts INTEGER := 5;
BEGIN
    UPDATE b2b_users
    SET failed_login_attempts = failed_login_attempts + 1,
        last_login_at = CURRENT_TIMESTAMP
    WHERE id = user_id
    RETURNING failed_login_attempts INTO current_attempts;

    -- Lock account if max attempts reached
    IF current_attempts >= max_attempts THEN
        PERFORM lock_user_account(user_id, 30); -- Lock for 30 minutes
    END IF;

    RETURN current_attempts;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset failed login attempts
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE b2b_users
    SET failed_login_attempts = 0,
        account_locked_until = NULL,
        last_login_at = CURRENT_TIMESTAMP
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically unlock expired locked accounts
CREATE OR REPLACE FUNCTION auto_unlock_accounts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE b2b_users
    SET account_locked_until = NULL,
        failed_login_attempts = 0
    WHERE account_locked_until <= CURRENT_TIMESTAMP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run auto-unlock function periodically
-- Note: This would typically be run as a scheduled job/cron
-- CREATE TRIGGER trigger_auto_unlock_accounts
--     AFTER INSERT ON b2b_users
--     FOR EACH ROW
--     EXECUTE FUNCTION auto_unlock_accounts();

-- Grant necessary permissions
-- GRANT EXECUTE ON FUNCTION is_user_account_locked(UUID) TO app_user;
-- GRANT EXECUTE ON FUNCTION lock_user_account(UUID, INTEGER) TO app_user;
-- GRANT EXECUTE ON FUNCTION increment_failed_login_attempts(UUID) TO app_user;
-- GRANT EXECUTE ON FUNCTION reset_failed_login_attempts(UUID) TO app_user;