import { TourImageService, ImageValidationError } from '../../../../application/services/TourImageService';
import { ITourImageRepository } from '../../../../infrastructure/database/repositories/TourImageRepository';
import { IStorageProvider } from '../../../../domain/repositories/StorageProvider';
import { TourImage } from '../../../../domain/entities/TourImage';

// Mock implementations
const mockTourImageRepository: jest.Mocked<ITourImageRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByTourId: jest.fn(),
  findMainImage: jest.fn(),
  update: jest.fn(),
  setMainImage: jest.fn(),
  delete: jest.fn(),
  deleteByTourId: jest.fn(),
  updateSortOrder: jest.fn(),
  getTotalSizeByTour: jest.fn(),
  countByTour: jest.fn(),
};

const mockStorageProvider: jest.Mocked<IStorageProvider> = {
  type: 'minio',
  initialize: jest.fn(),
  healthCheck: jest.fn(),
  uploadFile: jest.fn(),
  uploadImage: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
  getPresignedDownloadUrl: jest.fn(),
  getPublicUrl: jest.fn(),
  deleteFile: jest.fn(),
  fileExists: jest.fn(),
  getFileMetadata: jest.fn(),
  listFiles: jest.fn(),
  copyFile: jest.fn(),
  moveFile: jest.fn(),
};

describe('TourImageService', () => {
  let service: TourImageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TourImageService(
      mockTourImageRepository,
      mockStorageProvider,
      {
        maxFileSize: 5 * 1024 * 1024, // 5MB
        maxImagesPerTour: 20,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        generateThumbnail: true,
        generateOptimized: true
      }
    );
  });

  describe('uploadImages', () => {
    const tourId = 'tour-123';
    const uploadedBy = 'user-456';
    const files = [
      {
        buffer: Buffer.from('test-image-data'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      }
    ];

    it('should successfully upload valid images', async () => {
      // Mock storage provider uploadImage
      const mockUploadResult = {
        key: 'tours/tour-123/images/test.jpg',
        url: 'http://minio/travel-app/tours/tour-123/images/test.jpg',
        size: 1024 * 1024,
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        variants: {
          thumbnail: {
            key: 'tours/tour-123/images/test_thumbnail.jpg',
            url: 'http://minio/travel-app/tours/tour-123/images/test_thumbnail.jpg',
            width: 400,
            height: 300,
            size: 50 * 1024
          }
        }
      };

      mockStorageProvider.uploadImage.mockResolvedValue(mockUploadResult);

      // Mock repository methods
      mockTourImageRepository.countByTour.mockResolvedValue(0);
      mockTourImageRepository.findMainImage.mockResolvedValue(null);

      const mockTourImage: TourImage = {
        id: 'image-123',
        tourId,
        key: mockUploadResult.key,
        url: mockUploadResult.url,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: mockUploadResult.size,
        width: mockUploadResult.width,
        height: mockUploadResult.height,
        isMain: true,
        sortOrder: 0,
        uploadedBy,
        variants: mockUploadResult.variants,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({})
      };

      mockTourImageRepository.create.mockResolvedValue(mockTourImage);

      const result = await service.uploadImages(tourId, files, uploadedBy);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTourImage);
      expect(mockStorageProvider.uploadImage).toHaveBeenCalledWith(
        expect.any(String),
        files[0].buffer,
        files[0].mimetype,
        {
          generateThumbnail: true,
          generateOptimized: true,
          metadata: expect.objectContaining({
            tourId,
            originalName: files[0].originalname,
            uploadedBy
          })
        }
      );
    });

    it('should reject files that are too large', async () => {
      const oversizedFiles = [
        {
          buffer: Buffer.from('test-image-data'),
          originalname: 'large.jpg',
          mimetype: 'image/jpeg',
          size: 10 * 1024 * 1024 // 10MB - exceeds 5MB limit
        }
      ];

      await expect(service.uploadImages(tourId, oversizedFiles, uploadedBy))
        .rejects.toThrow('No images were successfully uploaded');
    });

    it('should reject files with invalid MIME types', async () => {
      const invalidFiles = [
        {
          buffer: Buffer.from('test-document-data'),
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1024 * 1024
        }
      ];

      await expect(service.uploadImages(tourId, invalidFiles, uploadedBy))
        .rejects.toThrow('No images were successfully uploaded');
    });

    it('should reject files exceeding image limit', async () => {
      // Mock repository to return max images already uploaded
      mockTourImageRepository.countByTour.mockResolvedValue(20);

      await expect(service.uploadImages(tourId, files, uploadedBy))
        .rejects.toThrow('No images were successfully uploaded');
    });
  });

  describe('getTourImages', () => {
    const tourId = 'tour-123';
    const limit = 10;

    it('should return tour images from repository', async () => {
      const mockImages: TourImage[] = [
        {
          id: 'image-1',
          tourId,
          key: 'test1.jpg',
          url: 'http://example.com/test1.jpg',
          filename: 'test1.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 1024,
          isMain: true,
          sortOrder: 0,
          uploadedBy: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          toJSON: () => ({})
        }
      ];

      mockTourImageRepository.findByTourId.mockResolvedValue(mockImages);

      const result = await service.getTourImages(tourId, limit);

      expect(mockTourImageRepository.findByTourId).toHaveBeenCalledWith(tourId, limit);
      expect(result).toEqual(mockImages);
    });
  });

  describe('getMainImage', () => {
    const tourId = 'tour-123';

    it('should return main image from repository', async () => {
      const mockMainImage: TourImage = {
        id: 'image-main',
        tourId,
        key: 'main.jpg',
        url: 'http://example.com/main.jpg',
        filename: 'main.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        isMain: true,
        sortOrder: 0,
        uploadedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({})
      };

      mockTourImageRepository.findMainImage.mockResolvedValue(mockMainImage);

      const result = await service.getMainImage(tourId);

      expect(mockTourImageRepository.findMainImage).toHaveBeenCalledWith(tourId);
      expect(result).toEqual(mockMainImage);
    });

    it('should return null if no main image exists', async () => {
      mockTourImageRepository.findMainImage.mockResolvedValue(null);

      const result = await service.getMainImage(tourId);

      expect(result).toBeNull();
    });
  });

  describe('setMainImage', () => {
    const tourId = 'tour-123';
    const imageId = 'image-456';
    const userId = 'user-789';

    it('should set main image successfully', async () => {
      const mockImage: TourImage = {
        id: imageId,
        tourId,
        key: 'test.jpg',
        url: 'http://example.com/test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        isMain: false,
        sortOrder: 1,
        uploadedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({})
      };

      mockTourImageRepository.findById.mockResolvedValue(mockImage);
      mockTourImageRepository.setMainImage.mockResolvedValue(undefined);

      await service.setMainImage(imageId, tourId, userId);

      expect(mockTourImageRepository.findById).toHaveBeenCalledWith(imageId);
      expect(mockTourImageRepository.setMainImage).toHaveBeenCalledWith(tourId, imageId);
    });

    it('should throw error if image does not exist', async () => {
      mockTourImageRepository.findById.mockResolvedValue(null);

      await expect(service.setMainImage(imageId, tourId, userId))
        .rejects.toThrow('Image not found');
    });

    it('should throw error if image does not belong to tour', async () => {
      const mockImage: TourImage = {
        id: imageId,
        tourId: 'different-tour',
        key: 'test.jpg',
        url: 'http://example.com/test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        isMain: false,
        sortOrder: 1,
        uploadedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({})
      };

      mockTourImageRepository.findById.mockResolvedValue(mockImage);

      await expect(service.setMainImage(imageId, tourId, userId))
        .rejects.toThrow('Image does not belong to this tour');
    });
  });

  describe('deleteImage', () => {
    const tourId = 'tour-123';
    const imageId = 'image-456';
    const userId = 'user-789';

    it('should delete image successfully', async () => {
      const mockImage: TourImage = {
        id: imageId,
        tourId,
        key: 'test.jpg',
        url: 'http://example.com/test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        isMain: false,
        sortOrder: 1,
        uploadedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: {
          thumbnail: {
            key: 'test_thumbnail.jpg',
            url: 'http://example.com/test_thumbnail.jpg',
            width: 400,
            height: 300,
            size: 50 * 1024
          }
        },
        toJSON: () => ({})
      };

      mockTourImageRepository.findById.mockResolvedValue(mockImage);
      mockStorageProvider.deleteFile.mockResolvedValue(undefined);
      mockTourImageRepository.delete.mockResolvedValue(undefined);
      mockTourImageRepository.findByTourId.mockResolvedValue([]);

      await service.deleteImage(imageId, userId);

      expect(mockTourImageRepository.findById).toHaveBeenCalledWith(imageId);
      expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith(mockImage.key);
      expect(mockTourImageRepository.delete).toHaveBeenCalledWith(imageId);
    });

    it('should handle main image deletion', async () => {
      const mockMainImage: TourImage = {
        id: imageId,
        tourId,
        key: 'main.jpg',
        url: 'http://example.com/main.jpg',
        filename: 'main.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        isMain: true,
        sortOrder: 0,
        uploadedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({})
      };

      const mockRemainingImage: TourImage = {
        id: 'remaining-image',
        tourId,
        key: 'remaining.jpg',
        url: 'http://example.com/remaining.jpg',
        filename: 'remaining.jpg',
        mimeType: 'image/jpeg',
        size: 1024 * 1024,
        isMain: false,
        sortOrder: 1,
        uploadedBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({})
      };

      mockTourImageRepository.findById.mockResolvedValue(mockMainImage);
      mockStorageProvider.deleteFile.mockResolvedValue(undefined);
      mockTourImageRepository.delete.mockResolvedValue(undefined);
      mockTourImageRepository.findByTourId.mockResolvedValue([mockRemainingImage]);
      mockTourImageRepository.setMainImage.mockResolvedValue(undefined);

      await service.deleteImage(imageId, userId);

      expect(mockTourImageRepository.setMainImage).toHaveBeenCalledWith(tourId, 'remaining-image');
    });
  });

  describe('getTourStorageStats', () => {
    const tourId = 'tour-123';

    it('should return storage statistics', async () => {
      const mockStats = {
        imageCount: 5,
        totalSize: 10 * 1024 * 1024, // 10MB
        mainImageExists: true
      };

      mockTourImageRepository.countByTour.mockResolvedValue(mockStats.imageCount);
      mockTourImageRepository.getTotalSizeByTour.mockResolvedValue(mockStats.totalSize);
      mockTourImageRepository.findMainImage.mockResolvedValue({} as TourImage);

      const result = await service.getTourStorageStats(tourId);

      expect(result).toEqual(mockStats);
    });

    it('should return mainImageExists false when no main image', async () => {
      mockTourImageRepository.countByTour.mockResolvedValue(3);
      mockTourImageRepository.getTotalSizeByTour.mockResolvedValue(5 * 1024 * 1024);
      mockTourImageRepository.findMainImage.mockResolvedValue(null);

      const result = await service.getTourStorageStats(tourId);

      expect(result.mainImageExists).toBe(false);
    });
  });
});