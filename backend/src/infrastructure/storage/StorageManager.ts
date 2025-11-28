import { IStorageProvider, StorageConfig, StorageHealthCheck } from '../../domain/repositories/StorageProvider';
import { MinIOStorage } from './MinIOStorage';
import { LocalStorage } from './LocalStorage';

/**
 * Storage Manager
 *
 * Manages storage providers with automatic fallback.
 * Primary: MinIO (S3-compatible)
 * Fallback: Local filesystem
 */
export class StorageManager implements IStorageProvider {
  readonly type: 'minio' | 'local';
  private primaryProvider: MinIOStorage;
  private fallbackProvider: LocalStorage;
  private currentProvider: IStorageProvider;
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval: number = 30000; // 30 seconds
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(minioConfig: StorageConfig, localConfig: StorageConfig) {
    this.primaryProvider = new MinIOStorage(minioConfig);
    this.fallbackProvider = new LocalStorage(localConfig);
    this.currentProvider = this.primaryProvider;
    this.type = 'minio';

    // Start health monitoring
    this.startHealthMonitoring();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize both providers
      await this.primaryProvider.initialize();
      await this.fallbackProvider.initialize();

      // Check which provider to use
      await this.checkProvidersHealth();
    } catch (error) {
      throw new Error(`Failed to initialize storage manager: ${error}`);
    }
  }

  private async checkProvidersHealth(): Promise<void> {
    const [minioHealth, localHealth] = await Promise.allSettled([
      this.primaryProvider.healthCheck(),
      this.fallbackProvider.healthCheck()
    ]);

    const minioIsHealthy = minioHealth.status === 'fulfilled' && minioHealth.value.status === 'healthy';
    const localIsHealthy = localHealth.status === 'fulfilled' && localHealth.value.status === 'healthy';

    if (minioIsHealthy && this.currentProvider.type === 'local') {
      // Switch back to MinIO if it's healthy and we're using local
      console.log('Switching to MinIO storage (recovered)');
      this.currentProvider = this.primaryProvider;
      (this as any).type = 'minio';
    } else if (!minioIsHealthy && localIsHealthy && this.currentProvider.type === 'minio') {
      // Switch to local storage if MinIO is unhealthy
      console.warn('MinIO storage unhealthy, switching to local storage');
      if (minioHealth.status === 'fulfilled') {
        console.warn(`MinIO error: ${minioHealth.value.error}`);
      }
      this.currentProvider = this.fallbackProvider;
      (this as any).type = 'local';
    }

    this.lastHealthCheck = new Date();
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkProvidersHealth();
    }, this.healthCheckInterval);
  }

  async healthCheck(): Promise<StorageHealthCheck> {
    await this.checkProvidersHealth();
    return this.currentProvider.healthCheck();
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<any> {
    return this.currentProvider.uploadFile(key, buffer, mimeType, metadata);
  }

  async uploadImage(
    key: string,
    buffer: Buffer,
    mimeType: string,
    options?: {
      generateThumbnail?: boolean;
      generateOptimized?: boolean;
      thumbnailSize?: { width: number; height: number };
      optimizedSize?: { width: number; height: number };
      metadata?: Record<string, string>;
    }
  ): Promise<any> {
    return this.currentProvider.uploadImage(key, buffer, mimeType, options);
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn?: number
  ): Promise<string> {
    return this.currentProvider.getPresignedUploadUrl(key, mimeType, expiresIn);
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn?: number
  ): Promise<string> {
    return this.currentProvider.getPresignedDownloadUrl(key, expiresIn);
  }

  getPublicUrl(key: string): string {
    return this.currentProvider.getPublicUrl(key);
  }

  async deleteFile(key: string): Promise<void> {
    return this.currentProvider.deleteFile(key);
  }

  async fileExists(key: string): Promise<boolean> {
    return this.currentProvider.fileExists(key);
  }

  async getFileMetadata(key: string): Promise<{
    size: number;
    mimeType: string;
    lastModified: Date;
    etag?: string;
  } | null> {
    return this.currentProvider.getFileMetadata(key);
  }

  async listFiles(prefix: string, maxKeys?: number): Promise<{
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag?: string;
    }>;
    isTruncated: boolean;
    nextMarker?: string;
  }> {
    return this.currentProvider.listFiles(prefix, maxKeys);
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    return this.currentProvider.copyFile(sourceKey, destinationKey);
  }

  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    return this.currentProvider.moveFile(sourceKey, destinationKey);
  }

  /**
   * Get current active storage provider
   */
  getCurrentProvider(): IStorageProvider {
    return this.currentProvider;
  }

  /**
   * Get health status of all providers
   */
  async getAllProvidersHealth(): Promise<{
    primary: StorageHealthCheck;
    fallback: StorageHealthCheck;
    current: 'minio' | 'local';
    lastCheck: Date | null;
  }> {
    const [primaryHealth, fallbackHealth] = await Promise.all([
      this.primaryProvider.healthCheck(),
      this.fallbackProvider.healthCheck()
    ]);

    return {
      primary: primaryHealth,
      fallback: fallbackHealth,
      current: this.currentProvider.type,
      lastCheck: this.lastHealthCheck
    };
  }

  /**
   * Force switch to specific provider
   */
  async switchToProvider(provider: 'minio' | 'local'): Promise<void> {
    if (provider === 'minio') {
      const health = await this.primaryProvider.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`Cannot switch to MinIO: ${health.error}`);
      }
      this.currentProvider = this.primaryProvider;
      (this as any).type = 'minio';
    } else {
      this.currentProvider = this.fallbackProvider;
      (this as any).type = 'local';
    }

    console.log(`Switched to ${provider} storage`);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopHealthMonitoring();
    // Add any additional cleanup if needed
  }
}