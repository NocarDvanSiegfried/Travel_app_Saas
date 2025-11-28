/**
 * Storage Provider Interface
 *
 * Defines abstraction for file storage operations.
 * Supports both MinIO (S3-compatible) and local filesystem storage.
 */

export interface StorageConfig {
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
  bucket: string;
  region?: string;
  useSSL?: boolean;
  localPath?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  etag?: string;
}

export interface ImageVariant {
  key: string;
  url: string;
  width: number;
  height: number;
  size: number;
}

export interface ImageUploadResult extends UploadResult {
  width: number;
  height: number;
  variants?: {
    thumbnail?: ImageVariant;
    optimized?: ImageVariant;
  };
}

export interface StorageHealthCheck {
  provider: 'minio' | 'local';
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

export interface IStorageProvider {
  /**
   * Storage provider type
   */
  readonly type: 'minio' | 'local';

  /**
   * Initialize the storage provider
   */
  initialize(): Promise<void>;

  /**
   * Check if storage is healthy and accessible
   */
  healthCheck(): Promise<StorageHealthCheck>;

  /**
   * Upload a file to storage
   */
  uploadFile(
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult>;

  /**
   * Upload an image with automatic processing
   */
  uploadImage(
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
  ): Promise<ImageUploadResult>;

  /**
   * Get a presigned URL for direct upload
   */
  getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresIn?: number
  ): Promise<string>;

  /**
   * Get a presigned URL for download
   */
  getPresignedDownloadUrl(
    key: string,
    expiresIn?: number
  ): Promise<string>;

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string;

  /**
   * Delete a file from storage
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Check if file exists
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getFileMetadata(key: string): Promise<{
    size: number;
    mimeType: string;
    lastModified: Date;
    etag?: string;
  } | null>;

  /**
   * List files in a prefix
   */
  listFiles(prefix: string, maxKeys?: number): Promise<{
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag?: string;
    }>;
    isTruncated: boolean;
    nextMarker?: string;
  }>;

  /**
   * Copy a file within storage
   */
  copyFile(sourceKey: string, destinationKey: string): Promise<void>;

  /**
   * Move/rename a file
   */
  moveFile(sourceKey: string, destinationKey: string): Promise<void>;
}