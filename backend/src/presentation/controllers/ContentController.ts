import { Request, Response } from 'express';
import { ContentService } from '../../application/services/ContentService';

/**
 * Content Controller
 *
 * Handles HTTP requests for dynamic content management.
 */
export class ContentController {
  private contentService: ContentService;

  constructor() {
    this.contentService = new ContentService();
  }

  /**
   * Get route sidebar content
   * GET /api/v1/content/route-sidebar
   */
  getRouteSidebarContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        routeId,
        device = 'desktop',
        region,
        limit = '10'
      } = req.query;

      const content = await this.contentService.getRouteSidebarContent({
        routeId: routeId as string,
        device: device as 'mobile' | 'desktop',
        region: region as string,
        limit: parseInt(limit as string, 10)
      });

      res.json({
        success: true,
        data: {
          content,
          count: content.length,
          filters: {
            routeId,
            device,
            region,
            limit
          }
        }
      });
    } catch (error) {
      console.error('Get route sidebar content error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Clear content cache
   * POST /api/v1/content/clear-cache
   */
  clearCache = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pattern } = req.body;

      await this.contentService.clearCache(pattern);

      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error) {
      console.error('Clear cache error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}