import { BaseEntity } from './BaseEntity'

/**
 * Tour Image Entity
 *
 * Represents an image associated with a tour.
 * Supports multiple image variants (original, thumbnail, optimized).
 */
export class TourImage implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly tourId: string,
    public readonly key: string,
    public readonly url: string,
    public readonly filename: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly uploadedBy: string,
    public readonly width?: number,
    public readonly height?: number,
    public readonly isMain: boolean = false,
    public readonly sortOrder: number = 0,
    public readonly altText?: string,
    public readonly variants?: {
      thumbnail?: {
        key: string;
        url: string;
        width: number;
        height: number;
      };
      optimized?: {
        key: string;
        url: string;
        width: number;
        height: number;
      };
    },
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      tourId: this.tourId,
      key: this.key,
      url: this.url,
      filename: this.filename,
      mimeType: this.mimeType,
      size: this.size,
      width: this.width,
      height: this.height,
      isMain: this.isMain,
      sortOrder: this.sortOrder,
      altText: this.altText,
      variants: this.variants,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      uploadedBy: this.uploadedBy
    };
  }

  static create(data: Partial<TourImage>): TourImage {
    return new TourImage(
      data.id || '',
      data.tourId || '',
      data.key || '',
      data.url || '',
      data.filename || '',
      data.mimeType || '',
      data.size || 0,
      data.uploadedBy || '',
      data.width,
      data.height,
      data.isMain ?? false,
      data.sortOrder ?? 0,
      data.altText,
      data.variants,
      data.createdAt || new Date(),
      data.updatedAt || new Date()
    );
  }

  isThumbnail(): boolean {
    return this.mimeType.startsWith('image/') && this.width !== undefined && this.height !== undefined;
  }

  getFileExtension(): string {
    return this.filename.split('.').pop() || '';
  }

  getHumanReadableSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.size;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}