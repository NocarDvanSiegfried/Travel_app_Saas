import { Request, Response } from 'express';
import { TourImageService, ImageValidationError } from '../../application/services/TourImageService';
import { TourImage } from '../../domain/entities/TourImage';
import { z } from 'zod';

// Extended Request interface for multer
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

interface FileRequest extends Omit<AuthenticatedRequest, 'files'> {
  files?: MulterFile[] | { [fieldname: string]: MulterFile[] } | MulterFile;
}

/**
 * Request validation schemas
 */
const uploadImagesSchema = z.object({
  tourId: z.string().uuid('Invalid tour ID format'),
});

const setMainImageSchema = z.object({
  tourId: z.string().uuid('Invalid tour ID format'),
  imageId: z.string().uuid('Invalid image ID format'),
});

const updateImageSchema = z.object({
  altText: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const imageParamsSchema = z.object({
  tourId: z.string().uuid('Invalid tour ID format'),
  imageId: z.string().uuid('Invalid image ID format'),
});

const updateSortOrderSchema = z.object({
  imageIds: z.array(z.string().uuid('Invalid image ID format')).min(1),
});

/**
 * Tour Image Controller
 *
 * Handles HTTP requests for tour image operations.
 */
export class TourImageController {
  constructor(private tourImageService: TourImageService) {}

  /**
   * Upload images for a tour
   * POST /api/v1/tours/:tourId/images
   */
  uploadImages = async (req: FileRequest, res: Response): Promise<void> => {
    try {
      // Validate request parameters
      const { tourId } = uploadImagesSchema.parse(req.params);

      // Handle both single file and array of files
      let uploadedFiles: MulterFile[] = [];
      if (req.files) {
        if (Array.isArray(req.files)) {
          uploadedFiles = req.files;
        } else if (typeof req.files === 'object' && 'files' in req.files) {
          uploadedFiles = req.files.files as MulterFile[];
        }
      }

      if (uploadedFiles.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded',
          code: 'NO_FILES'
        });
        return;
      }

      // Get user ID from authentication (assuming JWT middleware adds this)
      const uploadedBy = (req as any).user?.id || 'anonymous';

      // Convert files to service format
      const serviceFiles = uploadedFiles.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }));

      // Upload images
      const uploadedImages = await this.tourImageService.uploadImages(
        tourId,
        serviceFiles,
        uploadedBy
      );

      res.status(201).json({
        success: true,
        data: {
          images: uploadedImages.map(img => this.formatImageResponse(img)),
          count: uploadedImages.length
        },
        message: `${uploadedImages.length} images uploaded successfully`
      });
    } catch (error) {
      if (error instanceof ImageValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: 'VALIDATION_ERROR',
          field: error.field
        });
        return;
      }

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS',
          details: error.issues
        });
        return;
      }

      console.error('Upload images error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Get images for a tour
   * GET /api/v1/tours/:tourId/images
   */
  getTourImages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tourId } = uploadImagesSchema.parse(req.params);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const images = await this.tourImageService.getTourImages(tourId, limit);

      res.json({
        success: true,
        data: {
          images: images.map(img => this.formatImageResponse(img)),
          count: images.length
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      console.error('Get tour images error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Get main image for a tour
   * GET /api/v1/tours/:tourId/images/main
   */
  getMainImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tourId } = uploadImagesSchema.parse(req.params);

      const mainImage = await this.tourImageService.getMainImage(tourId);

      if (!mainImage) {
        res.status(404).json({
          success: false,
          error: 'Main image not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: this.formatImageResponse(mainImage)
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      console.error('Get main image error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Set main image for a tour
   * PUT /api/v1/tours/:tourId/images/:imageId/main
   */
  setMainImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tourId, imageId } = setMainImageSchema.parse({
        tourId: req.params.tourId,
        imageId: req.params.imageId
      });

      const uploadedBy = (req as any).user?.id || 'anonymous';

      await this.tourImageService.setMainImage(imageId, tourId, uploadedBy);

      res.json({
        success: true,
        message: 'Main image updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      if (error instanceof Error && error.message.includes('does not belong to this tour')) {
        res.status(404).json({
          success: false,
          error: error.message,
          code: 'NOT_FOUND'
        });
        return;
      }

      console.error('Set main image error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Update image metadata
   * PUT /api/v1/tours/:tourId/images/:imageId
   */
  updateImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tourId, imageId } = setMainImageSchema.parse({
        tourId: req.params.tourId,
        imageId: req.params.imageId
      });

      const updates = updateImageSchema.parse(req.body);
      const uploadedBy = (req as any).user?.id || 'anonymous';

      const updatedImage = await this.tourImageService.updateImage(
        imageId,
        updates,
        uploadedBy
      );

      res.json({
        success: true,
        data: this.formatImageResponse(updatedImage),
        message: 'Image updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS',
          details: error.issues
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          code: 'NOT_FOUND'
        });
        return;
      }

      console.error('Update image error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Update sort order for multiple images
   * PUT /api/v1/tours/:tourId/images/sort-order
   */
  updateSortOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tourId } = uploadImagesSchema.parse(req.params);
      const { imageIds } = updateSortOrderSchema.parse(req.body);

      const uploadedBy = (req as any).user?.id || 'anonymous';

      await this.tourImageService.updateSortOrder(tourId, imageIds, uploadedBy);

      res.json({
        success: true,
        message: 'Sort order updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS',
          details: error.issues
        });
        return;
      }

      if (error instanceof Error && error.message.includes('do not belong to this tour')) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: 'INVALID_IMAGES'
        });
        return;
      }

      console.error('Update sort order error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Delete an image
   * DELETE /api/v1/tours/:tourId/images/:imageId
   */
  deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tourId, imageId } = setMainImageSchema.parse({
        tourId: req.params.tourId,
        imageId: req.params.imageId
      });

      const uploadedBy = (req as any).user?.id || 'anonymous';

      await this.tourImageService.deleteImage(imageId, uploadedBy);

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          code: 'NOT_FOUND'
        });
        return;
      }

      console.error('Delete image error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Get storage statistics for a tour
   * GET /api/v1/tours/:tourId/images/stats
   */
  getTourStorageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tourId } = uploadImagesSchema.parse(req.params);

      const stats = await this.tourImageService.getTourStorageStats(tourId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          code: 'INVALID_PARAMS'
        });
        return;
      }

      console.error('Get storage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Get current storage provider info
   * GET /api/v1/storage/provider
   */
  getStorageProviderInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const storageProvider = this.tourImageService.getStorageProvider();

      const healthCheck = await storageProvider.healthCheck();

      res.json({
        success: true,
        data: {
          type: storageProvider.type,
          health: healthCheck
        }
      });
    } catch (error) {
      console.error('Get storage provider info error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Format image for API response
   */
  private formatImageResponse(image: TourImage): any {
    return {
      id: image.id,
      tourId: image.tourId,
      url: image.url,
      filename: image.filename,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      isMain: image.isMain,
      sortOrder: image.sortOrder,
      altText: image.altText,
      variants: image.variants,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt
    };
  }
}