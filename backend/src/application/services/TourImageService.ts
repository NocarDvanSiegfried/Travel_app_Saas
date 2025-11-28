import { TourImage } from '../../domain/entities/TourImage';
import { ITourImageRepository } from '../../infrastructure/database/repositories/TourImageRepository';
import { IStorageProvider } from '../../domain/repositories/StorageProvider';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validation errors for image uploads
 */
export class ImageValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

/**
 * Upload configuration
 */
export interface ImageUploadOptions {
  maxFileSize: number; // in bytes
  maxImagesPerTour: number;
  allowedMimeTypes: string[];
  generateThumbnail: boolean;
  generateOptimized: boolean;
  thumbnailSize: { width: number; height: number };
  optimizedSize: { width: number; height: number };
}

/**
 * Tour Image Service
 *
 * Handles business logic for tour image operations including
 * validation, storage, and database management.
 */
export class TourImageService {
  private defaultOptions: ImageUploadOptions = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxImagesPerTour: 20,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ],
    generateThumbnail: true,
    generateOptimized: true,
    thumbnailSize: { width: 400, height: 300 },
    optimizedSize: { width: 1200, height: 900 }
  };

  constructor(
    private tourImageRepository: ITourImageRepository,
    private storageProvider: IStorageProvider,
    private options: Partial<ImageUploadOptions> = {}
  ) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Upload images for a tour
   */
  async uploadImages(
    tourId: string,
    files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
    uploadedBy: string
  ): Promise<TourImage[]> {
    // Validate tour has not exceeded image limit
    await this.validateImageLimit(tourId, files.length);

    const uploadedImages: TourImage[] = [];

    for (const file of files) {
      try {
        // Validate individual file
        this.validateFile(file);

        // Generate unique key for storage
        const key = this.generateStorageKey(tourId, file.originalname);

        // Upload to storage
        const uploadResult = await this.storageProvider.uploadImage(key, file.buffer, file.mimetype, {
          generateThumbnail: this.options.generateThumbnail,
          generateOptimized: this.options.generateOptimized,
          thumbnailSize: this.options.thumbnailSize,
          optimizedSize: this.options.optimizedSize,
          metadata: {
            tourId,
            originalName: file.originalname,
            uploadedBy
          }
        });

        // Determine if this should be main image (first image if no main exists)
        const existingMainImage = await this.tourImageRepository.findMainImage(tourId);
        const isMain = existingMainImage === null && uploadedImages.length === 0;

        // Get next sort order
        const currentCount = await this.tourImageRepository.countByTour(tourId);
        const sortOrder = currentCount + uploadedImages.length;

        // Create database record
        const tourImage = await this.tourImageRepository.create({
          tourId,
          key: uploadResult.key,
          url: uploadResult.url,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: uploadResult.size,
          width: uploadResult.width,
          height: uploadResult.height,
          isMain,
          sortOrder,
          uploadedBy,
          variants: uploadResult.variants,
          toJSON: () => ({}) // Add empty toJSON method to satisfy type requirements
        });

        uploadedImages.push(tourImage);
      } catch (error) {
        // Log error but continue with other files
        console.error(`Failed to upload image ${file.originalname}:`, error);
        // In production, you might want to clean up partially uploaded files
      }
    }

    if (uploadedImages.length === 0) {
      throw new Error('No images were successfully uploaded');
    }

    return uploadedImages;
  }

  /**
   * Get images for a tour
   */
  async getTourImages(tourId: string, limit?: number): Promise<TourImage[]> {
    return this.tourImageRepository.findByTourId(tourId, limit);
  }

  /**
   * Get main image for a tour
   */
  async getMainImage(tourId: string): Promise<TourImage | null> {
    return this.tourImageRepository.findMainImage(tourId);
  }

  /**
   * Set main image for a tour
   */
  async setMainImage(imageId: string, tourId: string, userId: string): Promise<void> {
    const image = await this.tourImageRepository.findById(imageId);

    if (!image) {
      throw new Error('Image not found');
    }

    if (image.tourId !== tourId) {
      throw new Error('Image does not belong to this tour');
    }

    // TODO: Add authorization check - verify user owns the tour
    // await this.verifyTourOwnership(tourId, userId);

    await this.tourImageRepository.setMainImage(tourId, imageId);
  }

  /**
   * Update image metadata
   */
  async updateImage(
    imageId: string,
    updates: {
      altText?: string;
      sortOrder?: number;
    },
    userId: string
  ): Promise<TourImage> {
    const image = await this.tourImageRepository.findById(imageId);

    if (!image) {
      throw new Error('Image not found');
    }

    // TODO: Add authorization check
    // await this.verifyTourOwnership(image.tourId, userId);

    return this.tourImageRepository.update(imageId, updates);
  }

  /**
   * Update sort order for multiple images
   */
  async updateSortOrder(
    tourId: string,
    imageIds: string[],
    userId: string
  ): Promise<void> {
    // Verify all images belong to the tour
    const images = await Promise.all(
      imageIds.map(id => this.tourImageRepository.findById(id))
    );

    const invalidImages = images.filter((img: any) => !img || img.tourId !== tourId);
    if (invalidImages.length > 0) {
      throw new Error('One or more images do not belong to this tour');
    }

    // TODO: Add authorization check
    // await this.verifyTourOwnership(tourId, userId);

    await this.tourImageRepository.updateSortOrder(tourId, imageIds);
  }

  /**
   * Delete an image
   */
  async deleteImage(imageId: string, userId: string): Promise<void> {
    const image = await this.tourImageRepository.findById(imageId);

    if (!image) {
      throw new Error('Image not found');
    }

    // TODO: Add authorization check
    // await this.verifyTourOwnership(image.tourId, userId);

    try {
      // Delete from storage
      await this.storageProvider.deleteFile(image.key);

      // Delete variants if they exist
      if (image.variants?.thumbnail?.key) {
        await this.storageProvider.deleteFile(image.variants.thumbnail.key);
      }
      if (image.variants?.optimized?.key) {
        await this.storageProvider.deleteFile(image.variants.optimized.key);
      }

      // Delete from database
      await this.tourImageRepository.delete(imageId);

      // If this was the main image, set another as main if available
      if (image.isMain) {
        const remainingImages = await this.tourImageRepository.findByTourId(image.tourId, 1);
        if (remainingImages.length > 0) {
          const newMainImageId = typeof remainingImages[0].id === 'string' ? remainingImages[0].id : String(remainingImages[0].id);
          await this.tourImageRepository.setMainImage(image.tourId, newMainImageId);
        }
      }
    } catch (error) {
      console.error(`Failed to delete image ${imageId}:`, error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Delete all images for a tour
   */
  async deleteTourImages(tourId: string, userId: string): Promise<void> {
    // TODO: Add authorization check
    // await this.verifyTourOwnership(tourId, userId);

    const images = await this.tourImageRepository.findByTourId(tourId);

    for (const image of images) {
      try {
        // Delete from storage
        await this.storageProvider.deleteFile(image.key);

        // Delete variants
        if (image.variants?.thumbnail?.key) {
          await this.storageProvider.deleteFile(image.variants.thumbnail.key);
        }
        if (image.variants?.optimized?.key) {
          await this.storageProvider.deleteFile(image.variants.optimized.key);
        }
      } catch (error) {
        console.error(`Failed to delete storage file for image ${image.id}:`, error);
      }
    }

    // Delete from database
    await this.tourImageRepository.deleteByTourId(tourId);
  }

  /**
   * Get storage statistics for a tour
   */
  async getTourStorageStats(tourId: string): Promise<{
    imageCount: number;
    totalSize: number;
    mainImageExists: boolean;
  }> {
    const [imageCount, totalSize, mainImage] = await Promise.all([
      this.tourImageRepository.countByTour(tourId),
      this.tourImageRepository.getTotalSizeByTour(tourId),
      this.tourImageRepository.findMainImage(tourId)
    ]);

    return {
      imageCount,
      totalSize,
      mainImageExists: mainImage !== null
    };
  }

  /**
   * Validate individual file
   */
  private validateFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }): void {
    // Check file size
    if (file?.size && file.size > this.options.maxFileSize) {
      throw new ImageValidationError(
        `File size ${file.size} bytes exceeds maximum allowed size of ${this.options.maxFileSize} bytes`,
        'size'
      );
    }

    // Check MIME type
    if (!file?.mimetype || !this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new ImageValidationError(
        `File type ${file?.mimetype || 'unknown'} is not allowed. Allowed types: ${this.options.allowedMimeTypes.join(', ')}`,
        'mimetype'
      );
    }

    // Check filename
    if (!file.originalname || file.originalname.trim() === '') {
      throw new ImageValidationError('Filename is required', 'filename');
    }

    // Check for potential path traversal
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      throw new ImageValidationError('Invalid filename', 'filename');
    }
  }

  /**
   * Validate image limit for tour
   */
  private async validateImageLimit(tourId: string, newImageCount: number): Promise<void> {
    const currentCount = await this.tourImageRepository.countByTour(tourId) || 0;
    const totalCount = currentCount + newImageCount;

    if (totalCount > this.options.maxImagesPerTour) {
      throw new ImageValidationError(
        `Cannot upload ${newImageCount} images. Tour already has ${currentCount} images, maximum allowed is ${this.options.maxImagesPerTour}`,
        'limit'
      );
    }
  }

  /**
   * Generate storage key for image
   */
  private generateStorageKey(tourId: string, originalName: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const extension = originalName.split('.').pop() || 'jpg';

    return `tours/${tourId}/images/${timestamp}-${uuid}.${extension}`;
  }

  /**
   * Get current storage provider
   */
  getStorageProvider(): IStorageProvider {
    return this.storageProvider;
  }
}