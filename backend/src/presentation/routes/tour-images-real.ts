import { Router } from 'express';
import { TourImageController } from '../controllers/TourImageController';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * Tour Images Routes - Full Implementation
 *
 * API endpoints for tour image management with proper authentication
 */
export function createTourImageRoutes(
  controller: TourImageController,
  userRepository: any
): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticateToken(userRepository));

  /**
   * Upload images for a tour
   * POST /api/v1/tours/:tourId/images
   *
   * Upload multiple images for a tour.
   * Supports multipart/form-data with files.
   *
   * Example:
   * POST /api/v1/tours/uuid/images
   * Content-Type: multipart/form-data
   * Authorization: Bearer <jwt_token>
   *
   * Request:
   * files: Array of image files (max 20 files, 5MB each)
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     images: [...],
   *     count: number
   *   },
   *   message: "X images uploaded successfully"
   * }
   */
  router.post(
    '/:tourId/images',
    controller.uploadImages
  );

  /**
   * Get images for a tour
   * GET /api/v1/tours/:tourId/images
   *
   * Get all images for a tour, sorted by main flag first, then sort order.
   *
   * Query Parameters:
   * - limit: Maximum number of images to return (default: all)
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     images: [...],
   *     count: number
   *   }
   * }
   */
  router.get('/:tourId/images', controller.getTourImages);

  /**
   * Get main image for a tour
   * GET /api/v1/tours/:tourId/images/main
   *
   * Get the primary/main image for a tour.
   *
   * Response:
   * {
   *   success: true,
   *   data: { image }
   * }
   */
  router.get('/:tourId/images/main', controller.getMainImage);

  /**
   * Set main image for a tour
   * PUT /api/v1/tours/:tourId/images/:imageId/main
   *
   * Set an image as the main/primary image for a tour.
   *
   * Response:
   * {
   *   success: true,
   *   message: "Main image updated successfully"
   * }
   */
  router.put('/:tourId/images/:imageId/main', controller.setMainImage);

  /**
   * Update image metadata
   * PUT /api/v1/tours/:tourId/images/:imageId
   *
   * Update image metadata like alt text or sort order.
   *
   * Request Body:
   * {
   *   altText?: string,
   *   sortOrder?: number
   * }
   *
   * Response:
   * {
   *   success: true,
   *   data: { updatedImage },
   *   message: "Image updated successfully"
   * }
   */
  router.put('/:tourId/images/:imageId', controller.updateImage);

  /**
   * Update sort order for multiple images
   * PUT /api/v1/tours/:tourId/images/sort-order
   *
   * Update the sort order of multiple images at once.
   *
   * Request Body:
   * {
   *   imageIds: string[] // Array of image IDs in desired order
   * }
   *
   * Response:
   * {
   *   success: true,
   *   message: "Sort order updated successfully"
   * }
   */
  router.put('/:tourId/images/sort-order', controller.updateSortOrder);

  /**
   * Delete an image
   * DELETE /api/v1/tours/:tourId/images/:imageId
   *
   * Delete an image from storage and database.
   * If it was the main image, another image will be set as main if available.
   *
   * Response:
   * {
   *   success: true,
   *   message: "Image deleted successfully"
   * }
   */
  router.delete('/:tourId/images/:imageId', controller.deleteImage);

  /**
   * Get storage statistics for a tour
   * GET /api/v1/tours/:tourId/images/stats
   *
   * Get storage statistics for images of a specific tour.
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     imageCount: number,
   *     totalSize: number,
   *     mainImageExists: boolean
   *   }
   * }
   */
  router.get('/:tourId/images/stats', controller.getTourStorageStats);

  return router;
}

/**
 * Storage provider routes
 */
export function createStorageRoutes(
  controller: TourImageController,
  userRepository: any
): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticateToken(userRepository));

  /**
   * Get current storage provider info
   * GET /api/v1/storage/provider
   *
   * Get information about the current storage provider and its health status.
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     type: 'minio' | 'local',
   *     health: {
   *       provider: 'minio' | 'local',
   *       status: 'healthy' | 'unhealthy',
   *       latency?: number,
   *       error?: string
   *     }
   *   }
   * }
   */
  router.get('/provider', controller.getStorageProviderInfo);

  return router;
}