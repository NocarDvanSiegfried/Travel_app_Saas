import { Router } from 'express';
import { ContentController } from '../controllers/ContentController';

/**
 * Content Routes
 *
 * API endpoints for dynamic content management
 */
export function createContentRoutes(controller: ContentController): Router {
  const router = Router();

  /**
   * Get route sidebar content
   * GET /api/v1/content/route-sidebar
   *
   * Get dynamic content blocks for displaying in route search sidebar.
   * Content is personalized based on device type, region, and route context.
   *
   * Query Parameters:
   * - routeId?: string - Specific route ID for personalized content
   * - device?: 'mobile' | 'desktop' - Device type for responsive content
   * - region?: string - Geographic region for localized content
   * - limit?: number - Maximum number of content blocks (default: 10)
   *
   * Response:
   * {
   *   success: true,
   *   data: {
   *     content: Array<{
   *       id: string,
   *       type: 'advertisement' | 'recommendation' | 'promotion' | 'weather' | 'news',
   *       title: string,
   *       content: string,
   *       imageUrl?: string,
   *       linkUrl?: string,
   *       linkText?: string,
   *       priority: number,
   *       tags: string[]
   *     }>,
   *     count: number,
   *     filters: {
   *       routeId?: string,
   *       device: 'mobile' | 'desktop',
   *       region?: string,
   *       limit: number
   *     }
   *   }
   * }
   */
  router.get('/route-sidebar', controller.getRouteSidebarContent);

  /**
   * Clear content cache
   * POST /api/v1/content/clear-cache
   *
   * Clear cached content blocks. Useful for content management.
   * This endpoint should be protected in production.
   *
   * Request Body:
   * {
   *   pattern?: string - Cache key pattern to clear (optional, clears all if not provided)
   * }
   *
   * Response:
   * {
   *   success: true,
   *   message: "Cache cleared successfully"
   * }
   */
  router.post('/clear-cache', controller.clearCache);

  return router;
}