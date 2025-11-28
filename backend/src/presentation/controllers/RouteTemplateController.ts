import { Request, Response } from 'express';
import { RouteTemplateService } from '../../application/services/RouteTemplateService';

export class RouteTemplateController {
  constructor(private readonly routeTemplateService: RouteTemplateService) {}

  // CRUD Operations
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const template = await this.routeTemplateService.createTemplate(req.body, userId);
      res.status(201).json({
        success: true,
        data: template,
        message: 'Route template created successfully'
      });
    } catch (error) {
      console.error('Error creating route template:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      const template = await this.routeTemplateService.getTemplateById(
        id,
        companyId
      );

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // For public templates, allow access
      if (template.isPublicTemplate && template.isVerified) {
        res.json({
          success: true,
          data: template
        });
        return;
      }

      // Check if user has access to company templates
      if (template.companyId !== companyId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error getting route template:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const template = await this.routeTemplateService.updateTemplate(
        id,
        req.body,
        userId,
        companyId
      );

      res.json({
        success: true,
        data: template,
        message: 'Route template updated successfully'
      });
    } catch (error) {
      console.error('Error updating route template:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
                       error instanceof Error && error.message.includes('Permission denied') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.routeTemplateService.deleteTemplate(id, companyId);
      res.json({
        success: true,
        message: 'Route template deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting route template:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Search and Listing
  async searchTemplates(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      const filter = {
        companyId: userRole === 'admin' ? req.query.companyId as string : companyId,
        templateType: req.query.templateType as string,
        riskLevel: req.query.riskLevel as string,
        transportTypes: req.query.transportTypes ? (req.query.transportTypes as string).split(',') : undefined,
        isPublic: req.query.isPublic === 'true',
        isVerified: req.query.isVerified === 'true',
        minPopularity: req.query.minPopularity ? parseFloat(req.query.minPopularity as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        searchQuery: req.query.search as string,
        category: req.query.category as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof typeof filter] === undefined) {
          delete filter[key as keyof typeof filter];
        }
      });

      const result = await this.routeTemplateService.searchTemplates(filter);
      res.json({
        success: true,
        data: result.templates,
        pagination: {
          total: result.totalCount,
          limit: filter.limit,
          offset: filter.offset
        }
      });
    } catch (error) {
      console.error('Error searching route templates:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getPublicTemplates(req: Request, res: Response): Promise<void> {
    try {
      const options = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        category: req.query.category as string,
        riskLevel: req.query.riskLevel as string,
        transportTypes: req.query.transportTypes ? (req.query.transportTypes as string).split(',') : undefined
      };

      const result = await this.routeTemplateService.getPublicTemplates(options);
      res.json({
        success: true,
        data: result.templates,
        pagination: {
          total: result.totalCount,
          limit: options.limit,
          offset: options.offset
        }
      });
    } catch (error) {
      console.error('Error getting public templates:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Template Booking
  async bookTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const bookingResponse = await this.routeTemplateService.bookTemplate(
        req.body,
        userId,
        companyId
      );

      res.status(201).json({
        success: true,
        data: bookingResponse,
        message: 'Template booking request processed successfully'
      });
    } catch (error) {
      console.error('Error booking template:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async confirmBooking(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.routeTemplateService.confirmBooking(bookingId, userId, companyId);
      res.json({
        success: true,
        message: 'Booking confirmed successfully'
      });
    } catch (error) {
      console.error('Error confirming booking:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Bulk Operations
  async bulkCreateTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { templates } = req.body;
      if (!Array.isArray(templates)) {
        res.status(400).json({ error: 'Templates must be an array' });
        return;
      }

      if (templates.length > 50) {
        res.status(400).json({ error: 'Maximum 50 templates allowed per bulk operation' });
        return;
      }

      const result = await this.routeTemplateService.bulkCreateTemplates(templates, userId);
      res.status(201).json({
        success: true,
        data: result,
        message: `Successfully created ${result.successful} templates`
      });
    } catch (error) {
      console.error('Error in bulk creating templates:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async bulkUpdateTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        res.status(400).json({ error: 'Updates must be an array' });
        return;
      }

      if (updates.length > 50) {
        res.status(400).json({ error: 'Maximum 50 updates allowed per bulk operation' });
        return;
      }

      const result = await this.routeTemplateService.bulkUpdateTemplates(updates, userId, companyId);
      res.json({
        success: true,
        data: result,
        message: `Successfully updated ${result.successful} templates`
      });
    } catch (error) {
      console.error('Error in bulk updating templates:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async bulkDeleteTemplates(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { templateIds } = req.body;
      if (!Array.isArray(templateIds)) {
        res.status(400).json({ error: 'Template IDs must be an array' });
        return;
      }

      if (templateIds.length > 50) {
        res.status(400).json({ error: 'Maximum 50 templates allowed per bulk operation' });
        return;
      }

      const result = await this.routeTemplateService.bulkDeleteTemplates(templateIds, companyId);
      res.json({
        success: true,
        data: result,
        message: `Successfully deleted ${result.successful} templates`
      });
    } catch (error) {
      console.error('Error in bulk deleting templates:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Verification and Status Management
  async verifyTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { notes } = req.body;
      const template = await this.routeTemplateService.verifyTemplate(id, userId, notes, companyId);

      res.json({
        success: true,
        data: template,
        message: 'Template verified successfully'
      });
    } catch (error) {
      console.error('Error verifying template:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async toggleTemplateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const companyId = req.user?.companyId;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({ error: 'isActive must be boolean' });
        return;
      }

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const template = await this.routeTemplateService.toggleTemplateStatus(id, isActive, companyId);
      res.json({
        success: true,
        data: template,
        message: `Template ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling template status:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Analytics and Statistics
  async getTemplateUsageStatistics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const statistics = await this.routeTemplateService.getTemplateUsageStatistics(companyId);
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting template statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Template Cloning and Sharing
  async cloneTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName, targetCompanyId } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const clonedTemplate = await this.routeTemplateService.cloneTemplate(
        id,
        targetCompanyId || companyId,
        newName
      );

      res.status(201).json({
        success: true,
        data: clonedTemplate,
        message: 'Template cloned successfully'
      });
    } catch (error) {
      console.error('Error cloning template:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async makeTemplatePublic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const template = await this.routeTemplateService.makeTemplatePublic(id, companyId);
      res.json({
        success: true,
        data: template,
        message: 'Template made public successfully'
      });
    } catch (error) {
      console.error('Error making template public:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Template Recommendations
  async getTemplateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const criteria = {
        category: req.query.category as string,
        riskLevel: req.query.riskLevel as string,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        passengerCount: req.query.passengerCount ? parseInt(req.query.passengerCount as string) : undefined
      };

      // Remove undefined values
      Object.keys(criteria).forEach(key => {
        if (criteria[key as keyof typeof criteria] === undefined) {
          delete criteria[key as keyof typeof criteria];
        }
      });

      const recommendations = await this.routeTemplateService.getTemplateRecommendations(companyId, criteria);
      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('Error getting template recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Export/Import Operations
  async exportTemplatesToCSV(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const filter = {
        templateType: req.query.templateType as string,
        riskLevel: req.query.riskLevel as string,
        category: req.query.category as string,
        isVerified: req.query.isVerified === 'true',
        isActive: req.query.isActive === 'true'
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof typeof filter] === undefined) {
          delete filter[key as keyof typeof filter];
        }
      });

      const csvData = await this.routeTemplateService.exportTemplatesToCSV(companyId, filter);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="route_templates_${Date.now()}.csv"`);
      res.send(csvData);
    } catch (error) {
      console.error('Error exporting templates:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Performance Analysis
  async analyzeTemplatePerformance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const analysis = await this.routeTemplateService.analyzeTemplatePerformance(id, companyId);
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing template performance:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}