/**
 * Tour-related TypeScript types
 */

export interface TourImage {
  id: string;
  tourId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  isMain: boolean;
  sortOrder: number;
  altText?: string;
  variants?: {
    thumbnail?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    optimized?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface TourImageUploadResult {
  success: boolean;
  data: {
    images: TourImage[];
    count: number;
  };
  message: string;
}

export interface TourImagesResponse {
  success: boolean;
  data: {
    images: TourImage[];
    count: number;
  };
}

export interface TourImageUpdateRequest {
  altText?: string;
  sortOrder?: number;
}

export interface TourSortOrderRequest {
  imageIds: string[];
}

export interface TourStorageStats {
  imageCount: number;
  totalSize: number;
  mainImageExists: boolean;
}

export interface StorageProviderInfo {
  success: boolean;
  data: {
    type: 'minio' | 'local';
    health: {
      provider: 'minio' | 'local';
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
  };
}

export interface ImageUploadOptions {
  maxFileSize: number;
  maxImagesPerTour: number;
  allowedMimeTypes: string[];
}