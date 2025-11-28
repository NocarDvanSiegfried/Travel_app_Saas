import { Request, Response } from 'express';
import { InstantRefundService } from '../../application/services/InstantRefundService';

export class InstantRefundController {
  constructor(private readonly instantRefundService: InstantRefundService) {}

  // Process instant refund
  async processRefund(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user has permission to process refunds
      const allowedRoles = ['admin', 'manager', 'booking_agent', 'accountant'];
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions to process refunds' });
        return;
      }

      const refundRequest = {
        ...req.body,
        companyId,
        initiatedBy: userId
      };

      const result = await this.instantRefundService.processInstantRefund(refundRequest);

      const statusCode = result.status === 'processed' ? 200 :
                       result.status === 'pending' ? 202 :
                       result.status === 'rejected' ? 400 : 500;

      res.status(statusCode).json({
        success: result.status !== 'failed',
        data: result,
        message: this.getRefundStatusMessage(result.status)
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check refund eligibility
  async checkRefundEligibility(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId, refundAmount, passengerIds } = req.body;
      const companyId = req.user?.companyId;
      const userId = req.user?.id;

      if (!companyId || !userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!bookingId) {
        res.status(400).json({ error: 'Booking ID is required' });
        return;
      }

      if (!refundAmount || refundAmount <= 0) {
        res.status(400).json({ error: 'Valid refund amount is required' });
        return;
      }

      const refundRequest = {
        bookingId,
        refundAmount,
        passengerIds,
        companyId,
        refundReason: 'Eligibility check',
        initiatedBy: userId
      };

      const eligibility = await this.instantRefundService.checkRefundEligibility(refundRequest);

      res.json({
        success: true,
        data: {
          isEligible: eligibility.isEligible,
          refundAmount: eligibility.refundAmount,
          processingFee: eligibility.processingFee,
          finalRefundAmount: eligibility.finalRefundAmount,
          currency: eligibility.currency,
          refundPolicy: eligibility.refundPolicy,
          applicableRule: eligibility.applicableRule,
          rejectionReasons: eligibility.rejectionReasons,
          requiredApprovals: eligibility.requiredApprovals,
          processingTimeMinutes: eligibility.processingTimeMinutes,
          canProcessInstant: eligibility.requiredApprovals.length === 0 && eligibility.isEligible
        }
      });
    } catch (error) {
      console.error('Error checking refund eligibility:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get refund status
  async getRefundStatus(req: Request, res: Response): Promise<void> {
    try {
      const { refundId } = req.params;
      const companyId = req.user?.companyId;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // This would get refund status from repository
      // For now, returning placeholder data
      const refundStatus = {
        refundId,
        status: 'processed',
        refundAmount: 5000,
        currency: 'RUB',
        processingTimeMinutes: 1,
        createdAt: new Date(),
        processedAt: new Date(),
        transactionId: 'TXN_123456',
        auditTrail: []
      };

      res.json({
        success: true,
        data: refundStatus
      });
    } catch (error) {
      console.error('Error getting refund status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get refund statistics
  async getRefundStatistics(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user has permission to view statistics
      const allowedRoles = ['admin', 'manager', 'accountant'];
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions to view refund statistics' });
        return;
      }

      const options = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        category: req.query.category as string
      };

      const statistics = await this.instantRefundService.getRefundStatistics(companyId, options);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error getting refund statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Cancel pending refund
  async cancelRefund(req: Request, res: Response): Promise<void> {
    try {
      const { refundId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user has permission to cancel refunds
      const allowedRoles = ['admin', 'manager'];
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions to cancel refunds' });
        return;
      }

      if (!reason?.trim()) {
        res.status(400).json({ error: 'Cancellation reason is required' });
        return;
      }

      await this.instantRefundService.cancelRefund(refundId, userId, reason);

      res.json({
        success: true,
        message: 'Refund cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling refund:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get refund history
  async getRefundHistory(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user has permission to view refund history
      const allowedRoles = ['admin', 'manager', 'accountant', 'booking_agent'];
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions to view refund history' });
        return;
      }

      const options = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        status: req.query.status as string,
        category: req.query.category as string
      };

      // This would get refund history from repository
      // For now, returning placeholder data
      const refundHistory = {
        refunds: [
          {
            refundId: 'REFUND_123',
            bookingId: 'BOOKING_456',
            amount: 5000,
            currency: 'RUB',
            status: 'processed',
            reason: 'Trip cancellation',
            initiatedBy: userId,
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            processedAt: new Date(Date.now() - 86340000), // 1 minute later
            processingTimeMinutes: 1
          }
        ],
        total: 1,
        limit: options.limit,
        offset: options.offset
      };

      res.json({
        success: true,
        data: refundHistory
      });
    } catch (error) {
      console.error('Error getting refund history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get refund policies
  async getRefundPolicies(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user has permission to view policies
      const allowedRoles = ['admin', 'manager', 'booking_agent'];
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions to view refund policies' });
        return;
      }

      // This would get refund policies from repository
      // For now, returning default policy
      const policies = [
        {
          id: 'company_policy',
          name: 'Company Refund Policy',
          isActive: true,
          isGlobal: false,
          companyId: companyId,
          rules: [
            {
              id: 'standard_rule',
              condition: 'Standard cancellation',
              refundPercent: 100,
              processingFeePercent: 5,
              minRefundAmount: 100,
              maxRefundAmount: 100000,
              timeRestrictions: {
                minHoursBeforeDeparture: 24,
                maxHoursAfterDeparture: 48
              },
              categoryRestrictions: [],
              passengerRestrictions: {
                maxPassengers: 50,
                requiresManagerApproval: false
              }
            },
            {
              id: 'emergency_rule',
              condition: 'Emergency cancellation',
              refundPercent: 100,
              processingFeePercent: 0,
              minRefundAmount: 0,
              timeRestrictions: {
                maxHoursAfterDeparture: 168 // 7 days
              },
              categoryRestrictions: ['emergency'],
              passengerRestrictions: {
                maxPassengers: 100,
                requiresManagerApproval: true
              }
            }
          ]
        },
        {
          id: 'global_policy',
          name: 'Global Refund Policy',
          isActive: true,
          isGlobal: true,
          rules: [
            {
              id: 'global_default',
              condition: 'Default policy',
              refundPercent: 80,
              processingFeePercent: 10,
              minRefundAmount: 200,
              timeRestrictions: {
                minHoursBeforeDeparture: 48,
                maxHoursAfterDeparture: 24
              }
            }
          ]
        }
      ];

      res.json({
        success: true,
        data: policies
      });
    } catch (error) {
      console.error('Error getting refund policies:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update refund policy
  async updateRefundPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { policyId } = req.params;
      const userId = req.user?.id;
      const companyId = req.user?.companyId;
      const userRole = req.user?.role;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user has permission to update policies
      const allowedRoles = ['admin', 'manager'];
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({ error: 'Insufficient permissions to update refund policies' });
        return;
      }

      // This would update the refund policy in repository
      // For now, returning success
      res.json({
        success: true,
        message: 'Refund policy updated successfully'
      });
    } catch (error) {
      console.error('Error updating refund policy:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Helper method for status messages
  private getRefundStatusMessage(status: string): string {
    const messages = {
      processed: 'Refund processed successfully',
      pending: 'Refund is being processed',
      approved: 'Refund approved and pending processing',
      rejected: 'Refund request rejected',
      failed: 'Refund processing failed'
    };

    return messages[status as keyof typeof messages] || 'Refund status unknown';
  }
}