import { Request, Response } from 'express';
import { PassengerDataService } from '../../application/services/PassengerDataService';
import { validateUUID } from '../validators/common.validator';

export class PassengerDataController {
  constructor(private readonly passengerDataService: PassengerDataService) {}

  // Create new passenger
  async createPassenger(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // From auth middleware
      const companyId = req.user?.companyId; // From auth middleware

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const passenger = await this.passengerDataService.createPassenger(req.body, userId);
      res.status(201).json({
        success: true,
        data: passenger,
        message: 'Passenger created successfully'
      });
    } catch (error) {
      console.error('Error creating passenger:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get passenger by ID
  async getPassenger(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!validateUUID(id)) {
        res.status(400).json({ error: 'Invalid passenger ID' });
        return;
      }

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const passenger = await this.passengerDataService.getPassengerById(id, companyId);
      if (!passenger) {
        res.status(404).json({ error: 'Passenger not found' });
        return;
      }

      res.json({
        success: true,
        data: passenger
      });
    } catch (error) {
      console.error('Error getting passenger:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update passenger
  async updatePassenger(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!validateUUID(id)) {
        res.status(400).json({ error: 'Invalid passenger ID' });
        return;
      }

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const passenger = await this.passengerDataService.updatePassenger(id, req.body, userId, companyId);
      res.json({
        success: true,
        data: passenger,
        message: 'Passenger updated successfully'
      });
    } catch (error) {
      console.error('Error updating passenger:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete passenger
  async deletePassenger(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!validateUUID(id)) {
        res.status(400).json({ error: 'Invalid passenger ID' });
        return;
      }

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.passengerDataService.deletePassenger(id, companyId);
      res.json({
        success: true,
        message: 'Passenger deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting passenger:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Search passengers
  async searchPassengers(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const filter = {
        companyId,
        department: req.query.department as string,
        category: req.query.category as string,
        hasBenefits: req.query.hasBenefits === 'true',
        isVerified: req.query.isVerified === 'true',
        searchQuery: req.query.search as string,
        costCenterId: req.query.costCenterId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof typeof filter] === undefined) {
          delete filter[key as keyof typeof filter];
        }
      });

      const result = await this.passengerDataService.searchPassengers(filter);
      res.json({
        success: true,
        data: result.passengers,
        pagination: {
          total: result.totalCount,
          limit: filter.limit,
          offset: filter.offset
        }
      });
    } catch (error) {
      console.error('Error searching passengers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get passengers by company
  async getCompanyPassengers(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const options = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        category: req.query.category as string,
        department: req.query.department as string
      };

      const result = await this.passengerDataService.getPassengersByCompany(companyId, options);
      res.json({
        success: true,
        data: result.passengers,
        pagination: {
          total: result.totalCount,
          limit: options.limit,
          offset: options.offset
        }
      });
    } catch (error) {
      console.error('Error getting company passengers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Bulk create passengers
  async bulkCreatePassengers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { passengers } = req.body;
      if (!Array.isArray(passengers)) {
        res.status(400).json({ error: 'Passengers must be an array' });
        return;
      }

      if (passengers.length > 100) {
        res.status(400).json({ error: 'Maximum 100 passengers allowed per bulk operation' });
        return;
      }

      const result = await this.passengerDataService.bulkCreatePassengers(passengers, userId);
      res.status(201).json({
        success: true,
        data: result,
        message: `Successfully created ${result.successful} passengers`
      });
    } catch (error) {
      console.error('Error in bulk creating passengers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Bulk update passengers
  async bulkUpdatePassengers(req: Request, res: Response): Promise<void> {
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

      if (updates.length > 100) {
        res.status(400).json({ error: 'Maximum 100 updates allowed per bulk operation' });
        return;
      }

      const result = await this.passengerDataService.bulkUpdatePassengers(updates, userId, companyId);
      res.json({
        success: true,
        data: result,
        message: `Successfully updated ${result.successful} passengers`
      });
    } catch (error) {
      console.error('Error in bulk updating passengers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Bulk delete passengers
  async bulkDeletePassengers(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { passengerIds } = req.body;
      if (!Array.isArray(passengerIds)) {
        res.status(400).json({ error: 'Passenger IDs must be an array' });
        return;
      }

      if (passengerIds.length > 100) {
        res.status(400).json({ error: 'Maximum 100 passengers allowed per bulk operation' });
        return;
      }

      // Validate all UUIDs
      const invalidIds = passengerIds.filter(id => !validateUUID(id));
      if (invalidIds.length > 0) {
        res.status(400).json({ error: 'Invalid passenger IDs provided' });
        return;
      }

      const result = await this.passengerDataService.bulkDeletePassengers(passengerIds, companyId);
      res.json({
        success: true,
        data: result,
        message: `Successfully deleted ${result.successful} passengers`
      });
    } catch (error) {
      console.error('Error in bulk deleting passengers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Import passengers from CSV
  async importFromCSV(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'CSV file is required' });
        return;
      }

      if (!req.file.buffer) {
        res.status(400).json({ error: 'Invalid file format' });
        return;
      }

      const csvData = req.file.buffer.toString('utf-8');
      const result = await this.passengerDataService.importFromCSV(csvData, companyId, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: `Import completed: ${result.successfulImports} successful, ${result.failedImports} failed`
      });
    } catch (error) {
      console.error('Error importing passengers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Export passengers to CSV
  async exportToCSV(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const filter = {
        department: req.query.department as string,
        category: req.query.category as string,
        hasBenefits: req.query.hasBenefits === 'true',
        isVerified: req.query.isVerified === 'true',
        searchQuery: req.query.search as string,
        costCenterId: req.query.costCenterId as string
      };

      // Remove undefined values
      Object.keys(filter).forEach(key => {
        if (filter[key as keyof typeof filter] === undefined) {
          delete filter[key as keyof typeof filter];
        }
      });

      const csvData = await this.passengerDataService.exportToCSV(companyId, filter);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="passengers_${Date.now()}.csv"`);
      res.send(csvData);
    } catch (error) {
      console.error('Error exporting passengers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Verify passenger
  async verifyPassenger(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!validateUUID(id)) {
        res.status(400).json({ error: 'Invalid passenger ID' });
        return;
      }

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { notes } = req.body;
      const passenger = await this.passengerDataService.verifyPassenger(id, userId, notes, companyId);

      res.json({
        success: true,
        data: passenger,
        message: 'Passenger verified successfully'
      });
    } catch (error) {
      console.error('Error verifying passenger:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Bulk verify passengers
  async bulkVerifyPassengers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { passengerIds } = req.body;
      if (!Array.isArray(passengerIds)) {
        res.status(400).json({ error: 'Passenger IDs must be an array' });
        return;
      }

      if (passengerIds.length > 100) {
        res.status(400).json({ error: 'Maximum 100 passengers allowed per bulk operation' });
        return;
      }

      // Validate all UUIDs
      const invalidIds = passengerIds.filter(id => !validateUUID(id));
      if (invalidIds.length > 0) {
        res.status(400).json({ error: 'Invalid passenger IDs provided' });
        return;
      }

      const result = await this.passengerDataService.bulkVerifyPassengers(passengerIds, userId, companyId);
      res.json({
        success: true,
        data: result,
        message: `Successfully verified ${result.successful} passengers`
      });
    } catch (error) {
      console.error('Error in bulk verifying passengers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update benefits expiry status
  async updateBenefitsExpiryStatus(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.passengerDataService.updateBenefitsExpiryStatus(companyId);
      res.json({
        success: true,
        data: result,
        message: `Updated benefits expiry status for ${result.updatedCount} passengers`
      });
    } catch (error) {
      console.error('Error updating benefits expiry status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get passenger statistics
  async getPassengerStatistics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const statistics = await this.passengerDataService.getPassengerStatistics(companyId);
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting passenger statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Find suitable passengers for booking
  async findSuitablePassengers(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const requirements = {
        category: req.query.category as string,
        requiresSpecialAssistance: req.query.requiresSpecialAssistance === 'true',
        isVip: req.query.isVip === 'true',
        maxCount: req.query.maxCount ? parseInt(req.query.maxCount as string) : undefined
      };

      // Remove undefined values
      Object.keys(requirements).forEach(key => {
        if (requirements[key as keyof typeof requirements] === undefined) {
          delete requirements[key as keyof typeof requirements];
        }
      });

      const passengers = await this.passengerDataService.findSuitablePassengers(companyId, requirements);
      res.json({
        success: true,
        data: passengers,
        count: passengers.length
      });
    } catch (error) {
      console.error('Error finding suitable passengers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get passenger discount eligibility
  async getPassengerDiscountEligibility(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;

      if (!validateUUID(id)) {
        res.status(400).json({ error: 'Invalid passenger ID' });
        return;
      }

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const eligibility = await this.passengerDataService.getPassengerDiscountEligibility(id, companyId);
      res.json({
        success: true,
        data: eligibility
      });
    } catch (error) {
      console.error('Error getting passenger discount eligibility:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}