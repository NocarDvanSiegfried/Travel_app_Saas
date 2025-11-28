import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { B2BUser } from '../../domain/entities/B2BUser';

export interface SecureSession {
  id: string;
  userId: string;
  companyId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  fingerprint: string;
  lastActivity: Date;
  expiresAt: Date;
  twoFactorVerified: boolean;
  isRevoked: boolean;
  deviceType: 'web' | 'mobile' | 'api';
  location?: {
    country?: string;
    city?: string;
  };
}

export interface SecurityEvent {
  id: string;
  userId: string;
  sessionId?: string;
  type: 'SUSPICIOUS_LOGIN' | 'MULTIPLE_FAILED_ATTEMPTS' | 'IMPOSSIBLE_TRAVEL' | 'UNAUTHORIZED_ACCESS' | 'SESSION_HIJACKING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  resolved: boolean;
}

export interface SessionConfig {
  timeoutMinutes: number;
  maxConcurrentSessions: number;
  requireReauth: string[]; // Actions requiring re-authentication
  ipAddressWhitelist: string[];
  trustedDevices: string[];
}

export class B2BSessionSecurityService {
  private readonly SESSION_TIMEOUT_MINUTES = 15;
  private readonly MAX_CONCURRENT_SESSIONS = 5;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;
  private readonly ACCESS_TOKEN_EXPIRY_MINUTES = 30;

  // Create secure session with enhanced security features
  async createSecureSession(
    user: B2BUser,
    ipAddress: string,
    userAgent: string,
    twoFactorVerified: boolean = false
  ): Promise<SecureSession> {
    const now = new Date();
    const sessionId = uuidv4();
    const fingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);

    const session: SecureSession = {
      id: uuidv4(),
      userId: user.id,
      companyId: user.companyId,
      sessionId,
      accessToken: await this.generateSecureToken(),
      refreshToken: await this.generateSecureToken(),
      ipAddress,
      userAgent,
      fingerprint,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT_MINUTES * 60 * 1000),
      twoFactorVerified,
      isRevoked: false,
      deviceType: this.detectDeviceType(userAgent),
      location: await this.getLocationFromIp(ipAddress)
    };

    // Check for suspicious activity
    await this.checkSuspiciousActivity(user.id, session);

    // TODO: Save session to Redis/Database
    // await this.sessionRepository.save(session);

    return session;
  }

  // Validate session with security checks
  async validateSession(
    sessionId: string,
    accessToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ valid: boolean; session?: SecureSession; requiresReauth?: boolean }> {
    try {
      // TODO: Retrieve session from Redis/Database
      // const session = await this.sessionRepository.findBySessionId(sessionId);

      // Mock session for demonstration
      const session: SecureSession = {
        id: 'mock-session-id',
        userId: 'mock-user-id',
        companyId: 'mock-company-id',
        sessionId,
        accessToken,
        refreshToken: 'mock-refresh-token',
        ipAddress,
        userAgent,
        fingerprint: this.generateDeviceFingerprint(userAgent, ipAddress),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        twoFactorVerified: true,
        isRevoked: false,
        deviceType: this.detectDeviceType(userAgent)
      };

      if (!session || session.isRevoked) {
        return { valid: false };
      }

      // Check session expiry
      if (new Date() > session.expiresAt) {
        await this.revokeSession(session.id);
        return { valid: false, requiresReauth: true };
      }

      // Validate access token
      if (session.accessToken !== accessToken) {
        await this.logSecurityEvent(session.userId, {
          type: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          details: { invalidToken: true, sessionId },
          ipAddress,
          userAgent
        });
        return { valid: false };
      }

      // Check for session hijacking
      const currentFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);
      if (session.fingerprint !== currentFingerprint) {
        await this.logSecurityEvent(session.userId, {
          type: 'SESSION_HIJACKING',
          severity: 'CRITICAL',
          details: {
            originalFingerprint: session.fingerprint,
            currentFingerprint,
            originalIp: session.ipAddress,
            currentIp: ipAddress
          },
          ipAddress,
          userAgent
        });

        // Revoke all user sessions for security
        await this.revokeAllUserSessions(session.userId);
        return { valid: false, requiresReauth: true };
      }

      // Check for impossible travel (login from different locations in short time)
      if (await this.checkImpossibleTravel(session, ipAddress)) {
        await this.logSecurityEvent(session.userId, {
          type: 'IMPOSSIBLE_TRAVEL',
          severity: 'HIGH',
          details: {
            previousIp: session.ipAddress,
            currentIp: ipAddress,
            previousLocation: session.location,
            timeDiff: Date.now() - session.lastActivity.getTime()
          },
          ipAddress,
          userAgent
        });

        // Require re-authentication but don't revoke session
        return { valid: false, requiresReauth: true };
      }

      // Update last activity
      session.lastActivity = new Date();
      session.ipAddress = ipAddress;

      // Extend session expiry
      session.expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT_MINUTES * 60 * 1000);

      // TODO: Update session in Redis/Database
      // await this.sessionRepository.update(session);

      return { valid: true, session };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  // Refresh session tokens
  async refreshSession(
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ valid: boolean; session?: SecureSession; newTokens?: { accessToken: string; refreshToken: string } }> {
    try {
      // TODO: Find session by refresh token
      // const session = await this.sessionRepository.findByRefreshToken(refreshToken);

      // Mock session
      const session: SecureSession = {
        id: 'mock-session-id',
        userId: 'mock-user-id',
        companyId: 'mock-company-id',
        sessionId: 'mock-session',
        accessToken: 'old-access-token',
        refreshToken,
        ipAddress,
        userAgent,
        fingerprint: this.generateDeviceFingerprint(userAgent, ipAddress),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        twoFactorVerified: true,
        isRevoked: false,
        deviceType: this.detectDeviceType(userAgent)
      };

      if (!session || session.isRevoked) {
        return { valid: false };
      }

      // Generate new tokens
      const newTokens = {
        accessToken: await this.generateSecureToken(),
        refreshToken: await this.generateSecureToken()
      };

      // Update session
      session.accessToken = newTokens.accessToken;
      session.refreshToken = newTokens.refreshToken;
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT_MINUTES * 60 * 1000);

      // TODO: Update session in database
      // await this.sessionRepository.update(session);

      return { valid: true, session, newTokens };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { valid: false };
    }
  }

  // Revoke session
  async revokeSession(sessionId: string): Promise<void> {
    try {
      // TODO: Mark session as revoked in database
      // await this.sessionRepository.revoke(sessionId);
      console.log(`Session ${sessionId} revoked`);
    } catch (error) {
      console.error('Session revocation error:', error);
    }
  }

  // Revoke all user sessions
  async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      // TODO: Revoke all sessions for user
      // await this.sessionRepository.revokeAllByUserId(userId);
      console.log(`All sessions for user ${userId} revoked`);
    } catch (error) {
      console.error('Mass session revocation error:', error);
    }
  }

  // Generate secure random token
  private async generateSecureToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer.toString('hex'));
      });
    });
  }

  // Generate device fingerprint
  private generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const components = [
      userAgent,
      ipAddress,
      this.detectDeviceType(userAgent)
    ];

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  // Detect device type from user agent
  private detectDeviceType(userAgent: string): 'web' | 'mobile' | 'api' {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'mobile';
    }
    if (userAgent.includes('curl') || userAgent.includes('postman') || userAgent.includes('http')) {
      return 'api';
    }
    return 'web';
  }

  // Get location from IP address (mock implementation)
  private async getLocationFromIp(ipAddress: string): Promise<{ country?: string; city?: string }> {
    // TODO: Integrate with IP geolocation service
    // Example integration with ip-api.com or similar service

    try {
      // Mock location for demonstration
      if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('127.')) {
        return { country: 'Local', city: 'Development' };
      }

      // const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
      // const data = await response.json();
      // return { country: data.country, city: data.city };

      return { country: 'Unknown', city: 'Unknown' };
    } catch (error) {
      console.error('Failed to get location from IP:', error);
      return { country: 'Unknown', city: 'Unknown' };
    }
  }

  // Check for suspicious activity patterns
  private async checkSuspiciousActivity(userId: string, newSession: SecureSession): Promise<void> {
    try {
      // TODO: Implement suspicious activity detection
      // Check for:
      // - Multiple concurrent sessions from different IPs
      // - Rapid session creation
      // - Known malicious IP addresses
      // - Unusual time patterns

      console.log(`Checking suspicious activity for user ${userId}`);
    } catch (error) {
      console.error('Suspicious activity check error:', error);
    }
  }

  // Check for impossible travel scenario
  private async checkImpossibleTravel(session: SecureSession, currentIp: string): Promise<boolean> {
    try {
      // If same IP, no travel detected
      if (session.ipAddress === currentIp) {
        return false;
      }

      // Get current location
      const currentLocation = await this.getLocationFromIp(currentIp);

      // TODO: Calculate distance between previous and current location
      // Check if travel is possible in the time elapsed
      // This would require a distance calculation service

      // Simple check: if locations are very different and time is short
      const timeDiff = Date.now() - session.lastActivity.getTime();
      const timeDiffMinutes = timeDiff / (1000 * 60);

      // If locations are different and time is less than 5 minutes, suspicious
      if (currentLocation.country !== session.location?.country && timeDiffMinutes < 5) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Impossible travel check error:', error);
      return false;
    }
  }

  // Log security events
  private async logSecurityEvent(
    userId: string,
    event: Omit<SecurityEvent, 'id' | 'userId' | 'timestamp' | 'resolved'>
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: uuidv4(),
      userId,
      ...event,
      timestamp: new Date(),
      resolved: false
    };

    // TODO: Save to security events database
    console.log('Security Event:', securityEvent);

    // Send alerts for critical events
    if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
      // TODO: Send notification to security team
      console.log(`🚨 CRITICAL SECURITY ALERT: ${event.type} for user ${userId}`);
    }
  }

  // Get active sessions for user
  async getActiveSessions(userId: string): Promise<SecureSession[]> {
    try {
      // TODO: Retrieve from database
      // return await this.sessionRepository.findActiveByUserId(userId);

      // Mock return
      return [];
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  // Check if user has exceeded maximum concurrent sessions
  async checkConcurrentSessions(userId: string): Promise<boolean> {
    const activeSessions = await this.getActiveSessions(userId);
    return activeSessions.length >= this.MAX_CONCURRENT_SESSIONS;
  }

  // Force re-authentication for critical operations
  requiresReauth(action: string, userRole: string): boolean {
    const criticalActions = [
      'ROLE_CHANGE',
      'EMPLOYEE_DELETE',
      'COMPANY_SETTINGS_CHANGE',
      'DEPOSIT_REPLENISH_LARGE',
      'SENSITIVE_DATA_EXPORT',
      'BILLING_MANAGEMENT'
    ];

    return criticalActions.includes(action) ||
           (userRole === 'super_admin' || userRole === 'company_admin');
  }

  // Get session statistics for monitoring
  async getSessionStats(companyId?: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    suspiciousLogins: number;
    averageSessionDuration: number;
  }> {
    try {
      // TODO: Implement statistics calculation
      return {
        totalSessions: 0,
        activeSessions: 0,
        suspiciousLogins: 0,
        averageSessionDuration: 0
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        suspiciousLogins: 0,
        averageSessionDuration: 0
      };
    }
  }
}