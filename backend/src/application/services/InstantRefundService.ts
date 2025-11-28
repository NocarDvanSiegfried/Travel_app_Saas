import { TransactionLog, TransactionType } from '../../domain/entities/TransactionLog';
import { CorporateAccount } from '../../domain/entities/CorporateAccount';
import { B2BTicket } from '../../domain/entities/B2BTicket';

export interface RefundRequest {
  bookingId: string;
  ticketId?: string;
  templateBookingId?: string;
  companyId: string;
  refundAmount: number;
  refundReason: string;
  initiatedBy: string;
  passengerIds?: string[];
  partialRefund?: boolean;
  refundPolicy?: {
    refundPercent: number;
    processingFee: number;
    minRefundAmount: number;
  };
}

export interface RefundResponse {
  refundId: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed';
  refundAmount: number;
  currency: string;
  processingTimeMinutes: number;
  estimatedCompletionTime: Date;
  transactionId?: string;
  rejectionReason?: string;
  auditTrail: RefundAuditEntry[];
}

export interface RefundAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface RefundPolicy {
  id: string;
  name: string;
  rules: RefundRule[];
  isActive: boolean;
  companyId?: string;
  isGlobal: boolean;
}

export interface RefundRule {
  id: string;
  condition: string;
  refundPercent: number;
  processingFeePercent: number;
  minRefundAmount: number;
  maxRefundAmount?: number;
  timeRestrictions?: {
    minHoursBeforeDeparture?: number;
    maxHoursAfterDeparture?: number;
  };
  categoryRestrictions?: string[];
  passengerRestrictions?: {
    maxPassengers?: number;
    requiresManagerApproval?: boolean;
  };
}

export interface RefundEligibilityResult {
  isEligible: boolean;
  refundAmount: number;
  processingFee: number;
  finalRefundAmount: number;
  currency: string;
  refundPolicy: RefundPolicy;
  applicableRule: RefundRule;
  rejectionReasons?: string[];
  requiredApprovals?: string[];
  processingTimeMinutes: number;
}

export interface RefundStatistics {
  totalRefunds: number;
  totalRefundAmount: number;
  averageProcessingTimeMinutes: number;
  successRate: number;
  refundsByMonth: Record<string, number>;
  refundsByCategory: Record<string, number>;
  topRefundReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  processingEfficiency: {
    instantRefunds: number;
    standardRefunds: number;
    averageInstantTime: number;
    averageStandardTime: number;
  };
}

export class InstantRefundService {
  constructor(
    private readonly transactionLogRepository: any,
    private readonly corporateAccountRepository: any,
    private readonly b2bTicketRepository: any,
    private readonly templateBookingRepository: any,
    private readonly refundPolicyRepository: any,
    private readonly auditService: any,
    private readonly notificationService: any
  ) {}

  // Main refund processing
  async processInstantRefund(request: RefundRequest): Promise<RefundResponse> {
    const refundId = this.generateRefundId();
    const auditTrail: RefundAuditEntry[] = [];

    try {
      // Log refund initiation
      auditTrail.push({
        timestamp: new Date(),
        action: 'REFUND_INITIATED',
        performedBy: request.initiatedBy,
        details: `Refund request for booking ${request.bookingId}, amount ${request.refundAmount}`,
        metadata: {
          refundId,
          companyId: request.companyId,
          refundAmount: request.refundAmount,
          refundReason: request.refundReason
        }
      });

      // Validate refund request
      await this.validateRefundRequest(request, auditTrail);

      // Check refund eligibility
      const eligibility = await this.checkRefundEligibility(request);
      if (!eligibility.isEligible) {
        auditTrail.push({
          timestamp: new Date(),
          action: 'REFUND_REJECTED',
          performedBy: 'system',
          details: `Refund rejected: ${eligibility.rejectionReasons?.join(', ')}`,
          metadata: { eligibility }
        });

        return {
          refundId,
          status: 'rejected',
          refundAmount: 0,
          currency: eligibility.currency,
          processingTimeMinutes: 0,
          estimatedCompletionTime: new Date(),
          rejectionReason: eligibility.rejectionReasons?.join(', '),
          auditTrail
        };
      }

      // Check if instant processing is available
      const canProcessInstant = await this.canProcessInstantRefund(request, eligibility);
      const processingTime = canProcessInstant ? 1 : 30; // 1 minute for instant, 30 minutes for standard

      auditTrail.push({
        timestamp: new Date(),
        action: canProcessInstant ? 'INSTANT_PROCESSING' : 'STANDARD_PROCESSING',
        performedBy: 'system',
        details: `Refund will be processed via ${canProcessInstant ? 'instant' : 'standard'} method`,
        metadata: { processingTimeMinutes: processingTime }
      });

      // Process the refund
      if (canProcessInstant) {
        const transactionId = await this.processRefundTransaction(request, eligibility.finalRefundAmount, auditTrail);

        auditTrail.push({
          timestamp: new Date(),
          action: 'REFUND_PROCESSED',
          performedBy: request.initiatedBy,
          details: `Refund of ${eligibility.finalRefundAmount} processed successfully`,
          metadata: { transactionId }
        });

        return {
          refundId,
          status: 'processed',
          refundAmount: eligibility.finalRefundAmount,
          currency: eligibility.currency,
          processingTimeMinutes: 1,
          estimatedCompletionTime: new Date(),
          transactionId,
          auditTrail
        };
      } else {
        // Queue for standard processing
        await this.queueStandardRefund(request, eligibility, auditTrail);

        return {
          refundId,
          status: 'pending',
          refundAmount: eligibility.finalRefundAmount,
          currency: eligibility.currency,
          processingTimeMinutes,
          estimatedCompletionTime: new Date(Date.now() + processingTime * 60 * 1000),
          auditTrail
        };
      }
    } catch (error) {
      console.error('Error processing refund:', error);

      auditTrail.push({
        timestamp: new Date(),
        action: 'REFUND_ERROR',
        performedBy: 'system',
        details: `Refund processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return {
        refundId,
        status: 'failed',
        refundAmount: 0,
        currency: 'RUB',
        processingTimeMinutes: 0,
        estimatedCompletionTime: new Date(),
        auditTrail
      };
    }
  }

  // Refund eligibility check
  async checkRefundEligibility(request: RefundRequest): Promise<RefundEligibilityResult> {
    // Get booking details
    const bookingDetails = await this.getBookingDetails(request.bookingId);
    if (!bookingDetails) {
      return {
        isEligible: false,
        refundAmount: 0,
        processingFee: 0,
        finalRefundAmount: 0,
        currency: 'RUB',
        refundPolicy: this.getDefaultPolicy(),
        applicableRule: this.getDefaultRule(),
        rejectionReasons: ['Booking not found'],
        requiredApprovals: [],
        processingTimeMinutes: 0
      };
    }

    // Get applicable refund policy
    const refundPolicy = await this.getApplicableRefundPolicy(request.companyId, bookingDetails);
    const applicableRule = await this.getApplicableRefundRule(refundPolicy, bookingDetails, request);

    // Calculate refund amount based on policy
    const baseRefundAmount = Math.min(request.refundAmount, bookingDetails.totalPrice);
    const refundAmount = baseRefundAmount * (applicableRule.refundPercent / 100);
    const processingFee = refundAmount * (applicableRule.processingFeePercent / 100);
    const finalRefundAmount = Math.max(applicableRule.minRefundAmount, refundAmount - processingFee);

    // Check eligibility conditions
    const rejectionReasons: string[] = [];
    const requiredApprovals: string[] = [];

    // Time restrictions
    if (applicableRule.timeRestrictions) {
      const now = new Date();
      const departureTime = bookingDetails.departureDate;
      const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (applicableRule.timeRestrictions.minHoursBeforeDeparture &&
          hoursUntilDeparture < applicableRule.timeRestrictions.minHoursBeforeDeparture) {
        rejectionReasons.push(`Refund must be requested at least ${applicableRule.timeRestrictions.minHoursBeforeDeparture} hours before departure`);
      }

      if (applicableRule.timeRestrictions.maxHoursAfterDeparture &&
          hoursUntilDeparture < -applicableRule.timeRestrictions.maxHoursAfterDeparture) {
        rejectionReasons.push(`Refund request is too late (more than ${applicableRule.timeRestrictions.maxHoursAfterDeparture} hours after departure)`);
      }
    }

    // Category restrictions
    if (applicableRule.categoryRestrictions?.length &&
        !applicableRule.categoryRestrictions.includes(bookingDetails.category)) {
      rejectionReasons.push(`Booking category not eligible for refund`);
    }

    // Passenger restrictions
    if (applicableRule.passengerRestrictions) {
      if (applicableRule.passengerRestrictions.maxPassengers &&
          request.passengerIds && request.passengerIds.length > applicableRule.passengerRestrictions.maxPassengers) {
        rejectionReasons.push(`Exceeds maximum passengers for refund`);
      }

      if (applicableRule.passengerRestrictions.requiresManagerApproval) {
        requiredApprovals.push('manager');
      }
    }

    // Account balance check
    const corporateAccount = await this.corporateAccountRepository.findByCompanyId(request.companyId);
    if (!corporateAccount) {
      rejectionReasons.push('Corporate account not found');
    }

    const isEligible = rejectionReasons.length === 0;

    return {
      isEligible,
      refundAmount,
      processingFee,
      finalRefundAmount,
      currency: bookingDetails.currency || 'RUB',
      refundPolicy,
      applicableRule,
      rejectionReasons,
      requiredApprovals,
      processingTimeMinutes: requiredApprovals.length > 0 ? 60 : 5 // 60 minutes if approvals needed
    };
  }

  // Instant refund availability check
  private async canProcessInstantRefund(request: RefundRequest, eligibility: RefundEligibilityResult): Promise<boolean> {
    // Check if instant processing is available for this company
    const corporateAccount = await this.corporateAccountRepository.findByCompanyId(request.companyId);
    if (!corporateAccount || !corporateAccount.instantRefundEnabled) {
      return false;
    }

    // Check amount limits for instant processing
    if (eligibility.finalRefundAmount > corporateAccount.maxInstantRefundAmount) {
      return false;
    }

    // Check daily/monthly limits
    const todayUsage = await this.getTodayRefundUsage(request.companyId);
    if (todayUsage.totalAmount + eligibility.finalRefundAmount > corporateAccount.dailyRefundLimit) {
      return false;
    }

    // Check if approvals are required
    if (eligibility.requiredApprovals && eligibility.requiredApprovals.length > 0) {
      return false;
    }

    // Check fraud detection
    const fraudScore = await this.calculateFraudRisk(request);
    if (fraudScore > 0.7) {
      return false;
    }

    return true;
  }

  // Process refund transaction
  private async processRefundTransaction(request: RefundRequest, amount: number, auditTrail: RefundAuditEntry[]): Promise<string> {
    const corporateAccount = await this.corporateAccountRepository.findByCompanyId(request.companyId);
    if (!corporateAccount) {
      throw new Error('Corporate account not found');
    }

    // Create transaction log entry
    const transaction = new TransactionLog({
      companyId: request.companyId,
      type: TransactionType.REFUND,
      amount: -amount, // Negative for refund
      currency: corporateAccount.currency,
      description: `Refund for booking ${request.bookingId}`,
      relatedEntityType: 'booking',
      relatedEntityId: request.bookingId,
      initiatedBy: request.initiatedBy,
      status: 'pending'
    });

    const savedTransaction = await this.transactionLogRepository.create(transaction);

    // Update corporate account balance
    await this.updateCorporateAccountBalance(request.companyId, amount);

    // Update booking status
    await this.updateBookingStatus(request.bookingId, 'refunded');

    // Send notifications
    await this.sendRefundNotifications(request, amount, savedTransaction.id);

    auditTrail.push({
      timestamp: new Date(),
      action: 'TRANSACTION_RECORDED',
      performedBy: 'system',
      details: `Transaction ${savedTransaction.id} recorded for refund`,
      metadata: {
        transactionId: savedTransaction.id,
        amount,
        newBalance: corporateAccount.currentDepositBalance + amount
      }
    });

    return savedTransaction.id;
  }

  // Get refund statistics
  async getRefundStatistics(companyId: string, options: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
  } = {}): Promise<RefundStatistics> {
    const filter = {
      companyId,
      type: TransactionType.REFUND,
      startDate: options.startDate,
      endDate: options.endDate
    };

    const transactions = await this.transactionLogRepository.findByFilter(filter);
    const totalRefunds = transactions.length;
    const totalRefundAmount = transactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

    // Calculate processing times
    const processingTimes = transactions.map((t: any) => {
      if (t.createdAt && t.processedAt) {
        return (t.processedAt.getTime() - t.createdAt.getTime()) / (1000 * 60); // minutes
      }
      return 30; // default 30 minutes
    });

    const averageProcessingTimeMinutes = processingTimes.length > 0 ?
      processingTimes.reduce((sum: number, time: number) => sum + time, 0) / processingTimes.length : 0;

    const successfulRefunds = transactions.filter((t: any) => t.status === 'completed').length;
    const successRate = totalRefunds > 0 ? (successfulRefunds / totalRefunds) : 0;

    // Group by month
    const refundsByMonth: Record<string, number> = {};
    transactions.forEach((t: any) => {
      const month = new Date(t.createdAt).toISOString().substring(0, 7);
      refundsByMonth[month] = (refundsByMonth[month] || 0) + 1;
    });

    // Group by category
    const refundsByCategory: Record<string, number> = {};
    transactions.forEach((t: any) => {
      const category = t.category || 'unknown';
      refundsByCategory[category] = (refundsByCategory[category] || 0) + 1;
    });

    // Top refund reasons
    const reasonCounts: Record<string, number> = {};
    transactions.forEach((t: any) => {
      const reason = t.reason || 'other';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const topRefundReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalRefunds > 0 ? (count / totalRefunds) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Processing efficiency
    const instantRefunds = transactions.filter((t: any) => t.processingType === 'instant').length;
    const standardRefunds = transactions.filter((t: any) => t.processingType === 'standard').length;

    const instantTimes = transactions
      .filter((t: any) => t.processingType === 'instant')
      .map((t: any) => t.processingTimeMinutes || 1);

    const standardTimes = transactions
      .filter((t: any) => t.processingType === 'standard')
      .map((t: any) => t.processingTimeMinutes || 30);

    const averageInstantTime = instantTimes.length > 0 ?
      instantTimes.reduce((sum: number, time: number) => sum + time, 0) / instantTimes.length : 1;

    const averageStandardTime = standardTimes.length > 0 ?
      standardTimes.reduce((sum: number, time: number) => sum + time, 0) / standardTimes.length : 30;

    return {
      totalRefunds,
      totalRefundAmount,
      averageProcessingTimeMinutes,
      successRate,
      refundsByMonth,
      refundsByCategory,
      topRefundReasons,
      processingEfficiency: {
        instantRefunds,
        standardRefunds,
        averageInstantTime,
        averageStandardTime
      }
    };
  }

  // Cancel pending refund
  async cancelRefund(refundId: string, cancelledBy: string, reason: string): Promise<void> {
    // This would implement refund cancellation logic
    throw new Error('Refund cancellation not yet implemented');
  }

  // Helper methods
  private async validateRefundRequest(request: RefundRequest, auditTrail: RefundAuditEntry[]): Promise<void> {
    // Validate booking exists
    const bookingExists = await this.getBookingDetails(request.bookingId);
    if (!bookingExists) {
      throw new Error('Booking not found');
    }

    // Validate refund amount
    if (request.refundAmount <= 0) {
      throw new Error('Refund amount must be positive');
    }

    if (request.refundAmount > bookingExists.totalPrice) {
      throw new Error('Refund amount cannot exceed booking price');
    }

    // Validate refund reason
    if (!request.refundReason?.trim()) {
      throw new Error('Refund reason is required');
    }
  }

  private async getBookingDetails(bookingId: string): Promise<any> {
    // This would get booking details from either B2B tickets or template bookings
    try {
      // Try B2B ticket first
      const ticket = await this.b2bTicketRepository.findById(bookingId);
      if (ticket) {
        return {
          id: ticket.id,
          totalPrice: ticket.price,
          currency: ticket.currency,
          category: ticket.category,
          departureDate: ticket.eventDate,
          type: 'ticket'
        };
      }
    } catch (error) {
      // Continue to try template booking
    }

    try {
      // Try template booking
      const templateBooking = await this.templateBookingRepository.findById(bookingId);
      if (templateBooking) {
        return {
          id: templateBooking.id,
          totalPrice: templateBooking.finalPrice,
          currency: templateBooking.currency,
          category: 'template_booking',
          departureDate: templateBooking.departureDate,
          type: 'template_booking'
        };
      }
    } catch (error) {
      // No booking found
    }

    return null;
  }

  private async getApplicableRefundPolicy(companyId: string, bookingDetails: any): Promise<RefundPolicy> {
    // Try to get company-specific policy first
    const companyPolicy = await this.refundPolicyRepository.findByCompanyId(companyId);
    if (companyPolicy && companyPolicy.isActive) {
      return companyPolicy;
    }

    // Fall back to global policy
    const globalPolicy = await this.refundPolicyRepository.findGlobalActive();
    return globalPolicy || this.getDefaultPolicy();
  }

  private async getApplicableRefundRule(policy: RefundPolicy, bookingDetails: any, request: RefundRequest): Promise<RefundRule> {
    // Find the most applicable rule based on conditions
    // For now, return first rule or default
    return policy.rules[0] || this.getDefaultRule();
  }

  private getDefaultPolicy(): RefundPolicy {
    return {
      id: 'default_policy',
      name: 'Default Refund Policy',
      rules: [this.getDefaultRule()],
      isActive: true,
      isGlobal: true
    };
  }

  private getDefaultRule(): RefundRule {
    return {
      id: 'default_rule',
      condition: 'default',
      refundPercent: 100,
      processingFeePercent: 5,
      minRefundAmount: 100,
      maxRefundAmount: 100000,
      timeRestrictions: {
        minHoursBeforeDeparture: 24,
        maxHoursAfterDeparture: 48
      }
    };
  }

  private generateRefundId(): string {
    return `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getTodayRefundUsage(companyId: string): Promise<{ totalAmount: number; count: number }> {
    // This would check today's refund usage against limits
    return { totalAmount: 0, count: 0 };
  }

  private async calculateFraudRisk(request: RefundRequest): Promise<number> {
    // This would implement fraud detection logic
    return 0.1; // Low risk score
  }

  private async queueStandardRefund(request: RefundRequest, eligibility: RefundEligibilityResult, auditTrail: RefundAuditEntry[]): Promise<void> {
    // This would queue the refund for standard processing
    auditTrail.push({
      timestamp: new Date(),
      action: 'QUEUED_FOR_STANDARD_PROCESSING',
      performedBy: 'system',
      details: 'Refund queued for standard processing due to policy restrictions',
      metadata: { eligibility }
    });
  }

  private async updateCorporateAccountBalance(companyId: string, amount: number): Promise<void> {
    const account = await this.corporateAccountRepository.findByCompanyId(companyId);
    if (account) {
      account.currentDepositBalance += amount;
      await this.corporateAccountRepository.update(account);
    }
  }

  private async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    // This would update the booking status in the appropriate repository
    // Implementation depends on whether it's a B2B ticket or template booking
  }

  private async sendRefundNotifications(request: RefundRequest, amount: number, transactionId: string): Promise<void> {
    // This would send notifications about the refund
    await this.notificationService.sendRefundNotification({
      companyId: request.companyId,
      bookingId: request.bookingId,
      amount,
      transactionId,
      initiatedBy: request.initiatedBy,
      reason: request.refundReason
    });
  }
}