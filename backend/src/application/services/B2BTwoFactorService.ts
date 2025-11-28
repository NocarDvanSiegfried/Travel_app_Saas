import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { B2BUser } from '../../domain/entities/B2BUser';

export interface TwoFactorSecret {
  id: string;
  userId: string;
  secret: string;
  backupCodes: string[];
  isVerified: boolean;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface TwoFactorVerification {
  id: string;
  userId: string;
  type: 'TOTP' | 'SMS';
  code: string;
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface TwoFactorSms {
  id: string;
  userId: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  isVerified: boolean;
  createdAt: Date;
  verifiedAt?: Date;
}

export class B2BTwoFactorService {
  // Generate TOTP secret for user
  generateTotpSecret(userId: string): { secret: string; qrCodeUrl: string; backupCodes: string[] } {
    const secret = speakeasy.generateSecret({
      name: `B2B Portal (${userId})`,
      issuer: 'Travel App B2B',
      length: 32
    });

    // Generate backup codes (8 codes of 6 digits each)
    const backupCodes = Array.from({ length: 8 }, () =>
      Math.floor(100000 + Math.random() * 900000).toString()
    );

    // Generate QR code URL
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(secret.name)}?secret=${secret.base32}&issuer=${encodeURIComponent(secret.issuer)}`;

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes
    };
  }

  // Generate QR code image
  async generateQrCode(qrCodeUrl: string): Promise<string> {
    try {
      return await qrcode.toDataURL(qrCodeUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  // Verify TOTP token
  verifyTotpToken(secret: string, token: string, window: number = 1): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window, // Allow 1 step before and after for clock drift
      time: Math.floor(Date.now() / 1000)
    });
  }

  // Verify backup code
  verifyBackupCode(backupCodes: string[], providedCode: string): boolean {
    return backupCodes.includes(providedCode);
  }

  // Generate SMS verification code
  generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send SMS verification code
  async sendSmsCode(phoneNumber: string, code: string): Promise<boolean> {
    // Integration with SMS service (implementation depends on provider)
    // Example for Russian SMS providers

    try {
      // Mock implementation - replace with real SMS service
      console.log(`Sending SMS to ${phoneNumber}: Your verification code is ${code}`);

      // Example integration with SMS.ru or other provider:
      // const response = await fetch('https://sms.ru/sms/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      //   body: new URLSearchParams({
      //     api_id: process.env.SMS_API_KEY,
      //     to: phoneNumber,
      //     msg: `B2B Portal verification code: ${code}`,
      //     json: '1'
      //   })
      // });

      // const result = await response.json();
      // return result.status === 'OK';

      return true; // Mock success
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  // Check if 2FA is required for user
  isTwoFactorRequired(user: B2BUser, action?: string): boolean {
    // 2FA required for all admin roles
    if (user.role === 'super_admin' || user.role === 'company_admin') {
      return true;
    }

    // 2FA required for critical operations
    const criticalActions = [
      'ROLE_CHANGE',
      'EMPLOYEE_DELETE',
      'DEPOSIT_REPLENISH',
      'SENSITIVE_DATA_EXPORT',
      'BILLING_MANAGEMENT'
    ];

    return criticalActions.includes(action || '');
  }

  // Validate 2FA setup
  async validateTwoFactorSetup(
    userId: string,
    secret: string,
    token: string,
    backupCodes: string[]
  ): Promise<boolean> {
    try {
      // Verify the provided TOTP token
      const isValid = this.verifyTotpToken(secret, token);

      if (!isValid) {
        return false;
      }

      // Store secret and backup codes in database
      const twoFactorSecret: TwoFactorSecret = {
        id: uuidv4(),
        userId,
        secret,
        backupCodes,
        isVerified: true,
        createdAt: new Date(),
        verifiedAt: new Date()
      };

      // TODO: Save to database using repository
      // await this.twoFactorRepository.save(twoFactorSecret);

      return true;
    } catch (error) {
      console.error('Failed to validate 2FA setup:', error);
      return false;
    }
  }

  // Create 2FA verification session
  createTwoFactorVerification(
    userId: string,
    type: 'TOTP' | 'SMS',
    ipAddress: string,
    userAgent: string
  ): TwoFactorVerification {
    return {
      id: uuidv4(),
      userId,
      type,
      code: type === 'SMS' ? this.generateSmsCode() : '',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      isUsed: false,
      ipAddress,
      userAgent
    };
  }

  // Verify 2FA code
  async verifyTwoFactorCode(
    verification: TwoFactorVerification,
    providedCode: string,
    userSecret?: string
  ): Promise<{ success: boolean; remainingAttempts?: number }> {
    try {
      // Check if verification has expired
      if (new Date() > verification.expiresAt) {
        return { success: false };
      }

      // Check if maximum attempts exceeded
      if (verification.attempts >= 3) {
        return { success: false };
      }

      let isValid = false;

      if (verification.type === 'TOTP' && userSecret) {
        isValid = this.verifyTotpToken(userSecret, providedCode);
      } else if (verification.type === 'SMS') {
        isValid = verification.code === providedCode;
      }

      if (isValid) {
        verification.isUsed = true;
        // TODO: Update verification in database
        return { success: true };
      } else {
        verification.attempts++;
        // TODO: Update attempts in database
        return {
          success: false,
          remainingAttempts: 3 - verification.attempts
        };
      }
    } catch (error) {
      console.error('Failed to verify 2FA code:', error);
      return { success: false };
    }
  }

  // Generate secure random token
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Rate limiting for 2FA attempts
  async checkRateLimit(userId: string, action: string): Promise<boolean> {
    // TODO: Implement rate limiting using Redis
    // Prevent brute force attacks

    const key = `2fa_rate_limit:${userId}:${action}`;
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    // Mock implementation - replace with Redis rate limiting
    return true; // Allow attempt for now
  }

  // Audit logging for 2FA events
  async logTwoFactorEvent(
    userId: string,
    event: string,
    details: Record<string, any> = {},
    success: boolean = true
  ): Promise<void> {
    // TODO: Implement audit logging
    const auditEvent = {
      id: uuidv4(),
      userId,
      event,
      details,
      success,
      timestamp: new Date(),
      category: 'TWO_FACTOR_AUTH'
    };

    console.log('2FA Audit Event:', auditEvent);
    // TODO: Save to audit log database
  }
}