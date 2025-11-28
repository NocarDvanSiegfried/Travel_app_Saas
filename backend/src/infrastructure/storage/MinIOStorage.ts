import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import path from 'path';
import { IStorageProvider, StorageConfig, UploadResult, ImageUploadResult, StorageHealthCheck, ImageVariant } from '../../domain/repositories/StorageProvider';

/**
 * MinIO Storage Provider
 *
 * Implements S3-compatible storage using MinIO.
 * Supports image processing with Sharp library.
 */
export class MinIOStorage implements IStorageProvider {
  readonly type = 'minio' as const;
  private client: S3Client;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = {
      region: 'us-east-1',
      useSSL: false,
      ...config
    };

    this.client = new S3Client({
      endpoint: this.config.endpoint!,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKey!,
        secretAccessKey: this.config.secretKey!
      },
      forcePathStyle: true // Required for MinIO
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection and create bucket if it doesn't exist
      await this.healthCheck();
    } catch (error) {
      throw new Error(`Failed to initialize MinIO storage: ${error}`);
    }
  }

  async healthCheck(): Promise<StorageHealthCheck> {
    const startTime = Date.now();

    try {
      // Try to list objects to check connectivity
      await this.client.send(new ListObjectsV2Command({
        Bucket: this.config.bucket,
        MaxKeys: 1
      }));

      const latency = Date.now() - startTime;

      return {
        provider: 'minio',
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        provider: 'minio',
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
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: metadata
      });

      const result = await this.client.send(command);

      return {
        key,
        url: this.getPublicUrl(key),
        size: buffer.length,
        mimeType,
        etag: result.ETag
      };
    } catch (error) {
      throw new Error(`Failed to upload file to MinIO: ${error}`);
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
      throw new Error(`Failed to upload image to MinIO: ${error}`);
    }
  }

  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: mimeType
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new Error(`Failed to generate presigned upload URL: ${error}`);
    }
  }

  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      throw new Error(`Failed to generate presigned download URL: ${error}`);
    }
  }

  getPublicUrl(key: string): string {
    const baseUrl = this.config.endpoint?.replace(/\/$/, '');
    return `${baseUrl}/${this.config.bucket}/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete file from MinIO: ${error}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      await this.client.send(command);
      return true;
    } catch (error) {
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
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      const result = await this.client.send(command);

      return {
        size: result.ContentLength || 0,
        mimeType: result.ContentType || 'application/octet-stream',
        lastModified: result.LastModified || new Date(),
        etag: result.ETag
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
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const result = await this.client.send(command);

      const files = (result.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag
      }));

      return {
        files,
        isTruncated: result.IsTruncated || false,
        nextMarker: result.NextContinuationToken
      };
    } catch (error) {
      throw new Error(`Failed to list files in MinIO: ${error}`);
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${sourceKey}`,
        Key: destinationKey
      });

      await this.client.send(command);
    } catch (error) {
      throw new Error(`Failed to copy file in MinIO: ${error}`);
    }
  }

  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
  }

  private getVariantKey(originalKey: string, variant: 'thumbnail' | 'optimized'): string {
    const ext = path.extname(originalKey);
    const name = path.basename(originalKey, ext);
    const dir = path.dirname(originalKey);

    return path.join(dir, `${name}_${variant}${ext}`);
  }
}