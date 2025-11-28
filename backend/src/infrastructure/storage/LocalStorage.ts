import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { IStorageProvider, StorageConfig, UploadResult, ImageUploadResult, StorageHealthCheck, ImageVariant } from '../../domain/repositories/StorageProvider';

/**
 * Local Filesystem Storage Provider
 *
 * Implements file storage using local filesystem.
 * Serves as fallback when MinIO is unavailable.
 */
export class LocalStorage implements IStorageProvider {
  readonly type = 'local' as const;
  private config: StorageConfig;
  private basePath: string;

  constructor(config: StorageConfig) {
    this.config = config;
    this.basePath = config.localPath || './uploads';
  }

  async initialize(): Promise<void> {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(path.join(this.basePath, this.config.bucket), { recursive: true });
    } catch (error) {
      throw new Error(`Failed to initialize local storage: ${error}`);
    }
  }

  async healthCheck(): Promise<StorageHealthCheck> {
    const startTime = Date.now();

    try {
      // Try to access the base directory
      await fs.access(this.basePath, fs.constants.W_OK | fs.constants.R_OK);

      const latency = Date.now() - startTime;

      return {
        provider: 'local',
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        provider: 'local',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      };
    }
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      const filePath = this.getFilePath(key);
      const dir = path.dirname(filePath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, buffer);

      // Save metadata
      if (metadata) {
        await this.saveMetadata(key, {
          mimeType,
          size: buffer.length,
          metadata,
          uploadedAt: new Date().toISOString()
        });
      }

      return {
        key,
        url: this.getPublicUrl(key),
        size: buffer.length,
        mimeType,
        etag: this.generateETag(buffer)
      };
    } catch (error) {
      throw new Error(`Failed to upload file to local storage: ${error}`);
    }
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
  ): Promise<ImageUploadResult> {
    try {
      // Get image dimensions
      const metadata = await sharp(buffer).metadata();

      const uploadResult: ImageUploadResult = {
        key,
        url: this.getPublicUrl(key),
        size: buffer.length,
        mimeType,
        width: metadata.width || 0,
        height: metadata.height || 0
      };

      // Upload original image
      await this.uploadFile(key, buffer, mimeType, options?.metadata);

      // Generate thumbnail
      if (options?.generateThumbnail) {
        const thumbnailSize = options.thumbnailSize || { width: 400, height: 300 };
        const thumbnailKey = this.getVariantKey(key, 'thumbnail');

        const thumbnailBuffer = await sharp(buffer)
          .resize(thumbnailSize.width, thumbnailSize.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbnailResult = await this.uploadFile(
          thumbnailKey,
          thumbnailBuffer,
          'image/jpeg',
          { ...options?.metadata, variant: 'thumbnail' }
        );

        uploadResult.variants = {
          thumbnail: {
            key: thumbnailKey,
            url: thumbnailResult.url,
            width: thumbnailSize.width,
            height: thumbnailSize.height,
            size: thumbnailBuffer.length
          }
        };
      }

      // Generate optimized version
      if (options?.generateOptimized) {
        const optimizedSize = options.optimizedSize || { width: 1200, height: 900 };
        const optimizedKey = this.getVariantKey(key, 'optimized');

        const optimizedBuffer = await sharp(buffer)
          .resize(optimizedSize.width, optimizedSize.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        const optimizedResult = await this.uploadFile(
          optimizedKey,
          optimizedBuffer,
          'image/jpeg',
          { ...options?.metadata, variant: 'optimized' }
        );

        uploadResult.variants = {
          ...uploadResult.variants,
          optimized: {
            key: optimizedKey,
            url: optimizedResult.url,
            width: optimizedSize.width,
            height: optimizedSize.height,
            size: optimizedBuffer.length
          }
        };
      }

      return uploadResult;
    } catch (error) {
      throw new Error(`Failed to upload image to local storage: ${error}`);
    }
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // For local storage, we return a direct upload endpoint URL
    // In a real implementation, this might use a temporary token system
    throw new Error('Presigned URLs not supported for local storage');
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // For local storage, return direct URL
    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    // In production, this should be configured to return proper public URL
    // For now, return a relative path
    return `/uploads/${this.config.bucket}/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);

      // Also delete metadata file
      const metadataPath = this.getMetadataPath(key);
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file might not exist, ignore
      }
    } catch (error) {
      throw new Error(`Failed to delete file from local storage: ${error}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<{
    size: number;
    mimeType: string;
    lastModified: Date;
    etag?: string;
  } | null> {
    try {
      const filePath = this.getFilePath(key);
      const stats = await fs.stat(filePath);
      const metadata = await this.loadMetadata(key);

      return {
        size: stats.size,
        mimeType: metadata?.mimeType || 'application/octet-stream',
        lastModified: stats.mtime,
        etag: metadata?.etag || this.generateETag(await fs.readFile(filePath))
      };
    } catch (error) {
      return null;
    }
  }

  async listFiles(prefix: string, maxKeys: number = 1000): Promise<{
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag?: string;
    }>;
    isTruncated: boolean;
    nextMarker?: string;
  }> {
    try {
      const prefixPath = this.getFilePath(prefix);
      const files: Array<{
        key: string;
        size: number;
        lastModified: Date;
        etag?: string;
      }> = [];

      const walkDir = async (dir: string, currentPrefix: string) => {
        if (files.length >= maxKeys) return;

        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (files.length >= maxKeys) break;

          const entryPath = path.join(dir, entry.name);
          const entryKey = path.join(currentPrefix, entry.name);

          if (entry.isDirectory()) {
            await walkDir(entryPath, entryKey);
          } else if (entry.isFile() && !entry.name.endsWith('.meta.json')) {
            const stats = await fs.stat(entryPath);
            files.push({
              key: entryKey,
              size: stats.size,
              lastModified: stats.mtime,
              etag: this.generateETag(await fs.readFile(entryPath))
            });
          }
        }
      };

      await walkDir(prefixPath, prefix);

      return {
        files,
        isTruncated: false // For simplicity, always false for local storage
      };
    } catch (error) {
      throw new Error(`Failed to list files in local storage: ${error}`);
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const sourcePath = this.getFilePath(sourceKey);
      const destinationPath = this.getFilePath(destinationKey);

      const destinationDir = path.dirname(destinationPath);
      await fs.mkdir(destinationDir, { recursive: true });

      await fs.copyFile(sourcePath, destinationPath);

      // Copy metadata if exists
      const sourceMetadataPath = this.getMetadataPath(sourceKey);
      const destinationMetadataPath = this.getMetadataPath(destinationKey);

      try {
        await fs.copyFile(sourceMetadataPath, destinationMetadataPath);
      } catch {
        // Metadata file might not exist, ignore
      }
    } catch (error) {
      throw new Error(`Failed to copy file in local storage: ${error}`);
    }
  }

  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
  }

  private getFilePath(key: string): string {
    return path.join(this.basePath, this.config.bucket, key);
  }

  private getMetadataPath(key: string): string {
    return `${this.getFilePath(key)}.meta.json`;
  }

  private async saveMetadata(key: string, metadata: any): Promise<void> {
    const metadataPath = this.getMetadataPath(key);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async loadMetadata(key: string): Promise<any | null> {
    try {
      const metadataPath = this.getMetadataPath(key);
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private generateETag(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private getVariantKey(originalKey: string, variant: 'thumbnail' | 'optimized'): string {
    const ext = path.extname(originalKey);
    const name = path.basename(originalKey, ext);
    const dir = path.dirname(originalKey);

    return path.join(dir, `${name}_${variant}${ext}`);
  }
}