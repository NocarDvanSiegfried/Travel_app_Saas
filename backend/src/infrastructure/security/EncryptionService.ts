import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
  algorithm: string;
}

export interface KeyInfo {
  keyId: string;
  algorithm: string;
  createdAt: Date;
  isPrimary: boolean;
}

export class EncryptionService {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_DERIVATION_ALGORITHM = 'sha256';
  private readonly SALT_ROUNDS = 100000;
  private readonly IV_LENGTH = 16;
  private readonly TAG_LENGTH = 16;

  // Master encryption key (should be stored securely, e.g., in AWS KMS, Azure Key Vault)
  private readonly masterKey: string;
  private readonly keyRegistry: Map<string, KeyInfo> = new Map();

  constructor() {
    // In production, this should come from a secure key management system
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY || '';
    if (!this.masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }

    // Initialize with primary key
    this.initializeKeyRegistry();
  }

  // Initialize key registry with primary key
  private initializeKeyRegistry(): void {
    const primaryKeInfo: KeyInfo = {
      keyId: 'primary',
      algorithm: this.ENCRYPTION_ALGORITHM,
      createdAt: new Date(),
      isPrimary: true
    };

    this.keyRegistry.set('primary', primaryKeInfo);
  }

  // Derive encryption key using scrypt
  private async deriveEncryptionKey(keyId: string, salt?: Buffer): Promise<Buffer> {
    const keySalt = salt || crypto.randomBytes(32);
    const derivedKey = await scrypt(this.masterKey, keySalt, 32) as Buffer;

    return derivedKey;
  }

  // Encrypt sensitive data
  async encrypt(data: string, keyId: string = 'primary'): Promise<EncryptionResult> {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const salt = crypto.randomBytes(32);
      const encryptionKey = await this.deriveEncryptionKey(keyId, salt);

      const cipher = crypto.createCipher(this.ENCRYPTION_ALGORITHM, encryptionKey);
      cipher.setAAD(Buffer.from(keyId)); // Additional authenticated data

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.ENCRYPTION_ALGORITHM
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt sensitive data
  async decrypt(encryptedResult: EncryptionResult, keyId: string = 'primary'): Promise<string> {
    try {
      const iv = Buffer.from(encryptedResult.iv, 'hex');
      const tag = Buffer.from(encryptedResult.tag, 'hex');
      const salt = crypto.randomBytes(32); // In production, store and retrieve salt
      const encryptionKey = await this.deriveEncryptionKey(keyId, salt);

      const decipher = crypto.createDecipher(encryptedResult.algorithm, encryptionKey);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(keyId));

      let decrypted = decipher.update(encryptedResult.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Encrypt database fields (for at-rest encryption)
  async encryptField(data: string, fieldName: string, userId?: string): Promise<string> {
    const context = userId ? `${fieldName}:${userId}` : fieldName;
    const encryptionResult = await this.encrypt(data);

    // Combine components for storage
    const combined = [
      encryptionResult.algorithm,
      encryptionResult.iv,
      encryptionResult.tag,
      Buffer.from(context).toString('base64'),
      encryptionResult.encryptedData
    ].join(':');

    return Buffer.from(combined).toString('base64');
  }

  // Decrypt database fields
  async decryptField(encryptedField: string): Promise<string> {
    try {
      const combined = Buffer.from(encryptedField, 'base64').toString();
      const [algorithm, iv, tag, contextB64, encryptedData] = combined.split(':');

      const context = Buffer.from(contextB64, 'base64').toString();
      const encryptionResult: EncryptionResult = {
        algorithm,
        iv,
        tag,
        encryptedData
      };

      return await this.decrypt(encryptionResult, 'primary');
    } catch (error) {
      throw new Error(`Field decryption failed: ${error.message}`);
    }
  }

  // Hash passwords with strong algorithm
  async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const passwordSalt = salt || crypto.randomBytes(32).toString('hex');
    const derivedKey = await scrypt(password, passwordSalt, 64) as Buffer;

    const hash = derivedKey.toString('hex');

    return { hash, salt: passwordSalt };
  }

  // Verify password hash
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    try {
      const { hash: computedHash } = await this.hashPassword(password, salt);
      return computedHash === hash;
    } catch (error) {
      return false;
    }
  }

  // Encrypt PII (Personally Identifiable Information)
  async encryptPII(data: {
    fullName?: string;
    email?: string;
    phone?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    address?: string;
  }, userId: string): Promise<string> {
    const piiString = JSON.stringify(data);
    const encryptionResult = await this.encrypt(piiString, `pii:${userId}`);

    return Buffer.from(JSON.stringify(encryptionResult)).toString('base64');
  }

  // Decrypt PII
  async decryptPII(encryptedPII: string, userId: string): Promise<any> {
    try {
      const encryptionResult: EncryptionResult = JSON.parse(
        Buffer.from(encryptedPII, 'base64').toString()
      );

      const decryptedString = await this.decrypt(encryptionResult, `pii:${userId}`);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error(`PII decryption failed: ${error.message}`);
    }
  }

  // Generate secure random token
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate HMAC for data integrity
  generateHMAC(data: string, secret?: string): string {
    const hmacSecret = secret || this.masterKey;
    return crypto
      .createHmac('sha256', hmacSecret)
      .update(data)
      .digest('hex');
  }

  // Verify HMAC
  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Encrypt file content
  async encryptFile(buffer: Buffer, fileName: string): Promise<{
    encryptedBuffer: Buffer;
    encryptionInfo: EncryptionResult;
  }> {
    const encryptionInfo = await this.encrypt(buffer.toString('binary'));
    const encryptedBuffer = Buffer.from(encryptionInfo.encryptedData, 'hex');

    return {
      encryptedBuffer,
      encryptionInfo
    };
  }

  // Decrypt file content
  async decryptFile(encryptedBuffer: Buffer, encryptionInfo: EncryptionResult): Promise<Buffer> {
    const encryptedData = encryptedBuffer.toString('hex');
    const decryptedData = await this.decrypt({
      ...encryptionInfo,
      encryptedData
    });

    return Buffer.from(decryptedData, 'binary');
  }

  // Generate key pair for asymmetric encryption
  generateKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  // Encrypt with public key (for sharing with external parties)
  encryptWithPublicKey(data: string, publicKey: string): string {
    const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(data));
    return encrypted.toString('base64');
  }

  // Decrypt with private key
  decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    const decrypted = crypto.privateDecrypt(privateKey, Buffer.from(encryptedData, 'base64'));
    return decrypted.toString();
  }

  // Mask sensitive data for display
  maskSensitiveData(data: string, type: 'email' | 'phone' | 'card' | 'ssn' | 'passport'): string {
    switch (type) {
      case 'email':
        const [username, domain] = data.split('@');
        if (username.length <= 3) {
          return `${username[0]}***@${domain}`;
        }
        return `${username.slice(0, 3)}***@${domain}`;

      case 'phone':
        if (data.length < 4) {
          return '***';
        }
        return `${data.slice(0, 2)}***${data.slice(-2)}`;

      case 'card':
        if (data.length < 8) {
          return '****';
        }
        return `****-****-****-${data.slice(-4)}`;

      case 'ssn':
        if (data.length < 4) {
          return '***';
        }
        return `***-**-${data.slice(-4)}`;

      case 'passport':
        if (data.length < 3) {
          return '***';
        }
        return `${data.slice(0, 2)}${'*'.repeat(data.length - 3)}${data.slice(-1)}`;

      default:
        if (data.length <= 2) {
          return '**';
        }
        return `${data.slice(0, 1)}${'*'.repeat(data.length - 2)}${data.slice(-1)}`;
    }
  }

  // Create checksum for data integrity
  createChecksum(data: string | Buffer): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  // Verify checksum
  verifyChecksum(data: string | Buffer, expectedChecksum: string): boolean {
    const actualChecksum = this.createChecksum(data);
    return crypto.timingSafeEqual(
      Buffer.from(actualChecksum, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    );
  }

  // Secure random string generator
  generateSecureRandomString(length: number, chars?: string): string {
    const characterSet = chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      result += characterSet[randomBytes[i] % characterSet.length];
    }

    return result;
  }

  // Rotate encryption key
  async rotateEncryptionKey(): Promise<string> {
    const newKeyId = crypto.randomBytes(16).toString('hex');

    // Mark old keys as non-primary
    for (const [keyId, keyInfo] of this.keyRegistry.entries()) {
      keyInfo.isPrimary = false;
    }

    // Create new primary key
    const newKeyInfo: KeyInfo = {
      keyId: newKeyId,
      algorithm: this.ENCRYPTION_ALGORITHM,
      createdAt: new Date(),
      isPrimary: true
    };

    this.keyRegistry.set(newKeyId, newKeyInfo);

    // TODO: Implement data re-encryption with new key
    console.log(`Encryption key rotated. New key ID: ${newKeyId}`);

    return newKeyId;
  }

  // Get key information
  getKeyInfo(keyId: string): KeyInfo | undefined {
    return this.keyRegistry.get(keyId);
  }

  // List all encryption keys
  listKeys(): KeyInfo[] {
    return Array.from(this.keyRegistry.values());
  }

  // Test encryption/decryption functionality
  async testEncryption(): Promise<{ success: boolean; error?: string }> {
    try {
      const testData = 'This is a test string for encryption';
      const encrypted = await this.encrypt(testData);
      const decrypted = await this.decrypt(encrypted);

      if (testData === decrypted) {
        return { success: true };
      } else {
        return { success: false, error: 'Decrypted data does not match original' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}