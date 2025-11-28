import { RouteTemplate, TemplateType, RiskLevel, TemplateCategory, TransportType } from '../../domain/entities/RouteTemplate';
import { B2BCompany } from '../../domain/entities/B2BCompany';
import { B2BUser } from '../../domain/entities/B2BUser';

export interface RouteTemplateFilter {
  companyId?: string;
  templateType?: TemplateType;
  riskLevel?: RiskLevel;
  transportTypes?: TransportType[];
  isPublic?: boolean;
  isVerified?: boolean;
  minPopularity?: number;
  maxPrice?: number;
  searchQuery?: string;
  category?: TemplateCategory;
  limit?: number;
  offset?: number;
}

export interface RouteTemplateCreateRequest {
  companyId: string;
  templateName: string;
  templateDescription?: string;
  templateType: TemplateType;
  originPoint: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  destinationPoint: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  transportTypes: TransportType[];
  estimatedDurationMinutes: number;
  estimatedDistanceKm: number;
  hasTransfers?: boolean;
  transferPoints?: Array<{
    name: string;
    waitTimeMinutes: number;
    transferType: string;
    riskLevel: RiskLevel;
  }>;
  riskLevel?: RiskLevel;
  riskFactors?: {
    weatherDependency: number;
    seasonal: boolean;
    roadQuality: 'excellent' | 'good' | 'medium' | 'poor';
    frequencyReliability: number;
    infrastructureQuality: 'high' | 'medium' | 'low';
    trafficDependency: boolean;
  };
  maxPassengers?: number;
  minPassengers?: number;
  accessibilitySupport?: boolean;
  specialRequirements?: string[];
  isSeasonal?: boolean;
  seasonMonths?: number[];
  operatingDays?: string[];
  departureTimeConstraints?: {
    earliest?: string;
    latest?: string;
    preferred?: string[];
  };
  basePrice?: number;
  priceCurrency?: string;
  priceVariations?: {
    weekendSurcharge: number;
    seasonalSurcharge: number;
    lastMinuteSurcharge: number;
    groupDiscount: { minPassengers: number; discountPercent: number };
    corporateDiscountPercent: number;
  };
  corporateDiscountAvailable?: boolean;
  routeSegments?: Array<{
    type: TransportType;
    from: string;
    to: string;
    distance: number;
    estimatedTime: number;
    riskLevel: RiskLevel;
    price?: number;
    provider?: string;
    capacity?: number;
  }>;
  isPublicTemplate?: boolean;
  templateCategory?: TemplateCategory;
  externalProviderReferences?: Record<string, string>;
  multimodalSettings?: {
    autoBooking: boolean;
    connectionBufferMinutes: number;
    transferInsurance: boolean;
    realTimeTracking: boolean;
    alternativeTransportAllowed: boolean;
  };
}

export interface RouteTemplateUpdateRequest {
  templateName?: string;
  templateDescription?: string;
  originPoint?: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  destinationPoint?: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  transportTypes?: TransportType[];
  estimatedDurationMinutes?: number;
  estimatedDistanceKm?: number;
  hasTransfers?: boolean;
  transferPoints?: Array<{
    name: string;
    waitTimeMinutes: number;
    transferType: string;
    riskLevel: RiskLevel;
  }>;
  riskLevel?: RiskLevel;
  riskFactors?: {
    weatherDependency: number;
    seasonal: boolean;
    roadQuality: 'excellent' | 'good' | 'medium' | 'poor';
    frequencyReliability: number;
    infrastructureQuality: 'high' | 'medium' | 'low';
    trafficDependency: boolean;
  };
  maxPassengers?: number;
  minPassengers?: number;
  accessibilitySupport?: boolean;
  specialRequirements?: string[];
  isSeasonal?: boolean;
  seasonMonths?: number[];
  operatingDays?: string[];
  departureTimeConstraints?: {
    earliest?: string;
    latest?: string;
    preferred?: string[];
  };
  basePrice?: number;
  priceCurrency?: string;
  priceVariations?: {
    weekendSurcharge: number;
    seasonalSurcharge: number;
    lastMinuteSurcharge: number;
    groupDiscount: { minPassengers: number; discountPercent: number };
    corporateDiscountPercent: number;
  };
  corporateDiscountAvailable?: boolean;
  routeSegments?: Array<{
    type: TransportType;
    from: string;
    to: string;
    distance: number;
    estimatedTime: number;
    riskLevel: RiskLevel;
    price?: number;
    provider?: string;
    capacity?: number;
  }>;
  isActive?: boolean;
  isVerified?: boolean;
  verificationNotes?: string;
  isPublicTemplate?: boolean;
  templateCategory?: TemplateCategory;
  externalProviderReferences?: Record<string, string>;
  multimodalSettings?: {
    autoBooking: boolean;
    connectionBufferMinutes: number;
    transferInsurance: boolean;
    realTimeTracking: boolean;
    alternativeTransportAllowed: boolean;
  };
}

export interface TemplateBookingRequest {
  templateId: string;
  bookingName: string;
  departureDate: Date;
  returnDate?: Date;
  passengerDataIds: string[];
  additionalServices?: Array<{
    name: string;
    price: number;
  }>;
  meetingPoints?: Array<{
    location: string;
    time: string;
    address: string;
  }>;
}

export interface TemplateBookingResponse {
  bookingId: string;
  template: RouteTemplate;
  bookingDetails: {
    passengerCount: number;
    calculatedPrice: number;
    discountApplied: number;
    finalPrice: number;
    currency: string;
  };
  estimatedDepartureTime: Date;
  estimatedArrivalTime: Date;
  riskAssessment: {
    overallRiskScore: number;
    recommendations: string[];
  };
  confirmationRequired: boolean;
  paymentRequired: boolean;
}

export interface BulkOperationResult {
  totalRequested: number;
  successful: number;
  failed: number;
  errors: Array<{ templateId: string; error: string }>;
}

export interface TemplateUsageStatistics {
  totalTemplates: number;
  activeTemplates: number;
  publicTemplates: number;
  verifiedTemplates: number;
  averagePopularityScore: number;
  usageByCategory: Record<TemplateCategory, number>;
  usageByRiskLevel: Record<RiskLevel, number>;
  mostUsedTemplates: Array<{
    templateId: string;
    templateName: string;
    usageCount: number;
    popularityScore: number;
  }>;
  recentBookings: Array<{
    bookingId: string;
    templateId: string;
    templateName: string;
    departureDate: Date;
    passengerCount: number;
    price: number;
  }>;
}

export class RouteTemplateService {
  constructor(
    private readonly routeTemplateRepository: any,
    private readonly templateBookingRepository: any,
    private readonly companyRepository: any,
    private readonly passengerDataRepository: any,
    private readonly financialService: any
  ) {}

  // CRUD Operations
  async createTemplate(request: RouteTemplateCreateRequest, createdBy: string): Promise<RouteTemplate> {
    // Validate company exists
    const company = await this.companyRepository.findById(request.companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Create route template
    const template = new RouteTemplate({
      ...request,
      createdBy
    });

    // Validate template
    const validationErrors = template.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Save to database
    const savedTemplate = await this.routeTemplateRepository.create(template);
    return savedTemplate;
  }

  async getTemplateById(id: string, requestCompanyId?: string): Promise<RouteTemplate | null> {
    const template = await this.routeTemplateRepository.findById(id);

    if (!template) {
      return null;
    }

    // Check access permissions
    if (requestCompanyId && template.companyId !== requestCompanyId && !template.isPublicTemplate) {
      return null;
    }

    return template;
  }

  async updateTemplate(
    id: string,
    request: RouteTemplateUpdateRequest,
    updatedBy: string,
    requestCompanyId?: string
  ): Promise<RouteTemplate> {
    const template = await this.getTemplateById(id, requestCompanyId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if user has permission to update
    if (template.companyId !== requestCompanyId) {
      throw new Error('Permission denied');
    }

    // Update template data
    Object.assign(template, request);
    template.updatedBy = updatedBy;

    // Validate updated template
    const validationErrors = template.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const savedTemplate = await this.routeTemplateRepository.update(template);
    return savedTemplate;
  }

  async deleteTemplate(id: string, requestCompanyId: string): Promise<void> {
    const template = await this.getTemplateById(id, requestCompanyId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if template has active bookings
    const hasActiveBookings = await this.checkActiveBookings(id);
    if (hasActiveBookings) {
      throw new Error('Cannot delete template with active bookings');
    }

    await this.routeTemplateRepository.delete(id);
  }

  // Search and Filtering
  async searchTemplates(filter: RouteTemplateFilter): Promise<{
    templates: RouteTemplate[];
    totalCount: number;
  }> {
    const result = await this.routeTemplateRepository.findByFilter(filter);

    // Apply additional filtering if needed
    let filteredTemplates = result.templates;

    if (filter.maxPrice) {
      filteredTemplates = filteredTemplates.filter(template =>
        !template.basePrice || template.basePrice <= filter.maxPrice!
      );
    }

    if (filter.minPopularity) {
      filteredTemplates = filteredTemplates.filter(template =>
        template.popularityScore >= filter.minPopularity!
      );
    }

    return {
      templates: filteredTemplates,
      totalCount: result.totalCount
    };
  }

  async getPublicTemplates(options: {
    limit?: number;
    offset?: number;
    category?: TemplateCategory;
    riskLevel?: RiskLevel;
    transportTypes?: TransportType[];
  } = {}): Promise<{
    templates: RouteTemplate[];
    totalCount: number;
  }> {
    return this.searchTemplates({
      isPublic: true,
      isVerified: true,
      isActive: true,
      category: options.category,
      riskLevel: options.riskLevel,
      transportTypes: options.transportTypes,
      limit: options.limit,
      offset: options.offset
    });
  }

  // Template Booking
  async bookTemplate(request: TemplateBookingRequest, bookedBy: string, companyId: string): Promise<TemplateBookingResponse> {
    // Get template
    const template = await this.getTemplateById(request.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check template availability
    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    if (!template.isAvailableForDate(request.departureDate)) {
      throw new Error('Template is not available for selected date');
    }

    // Validate passengers
    const passengers = await this.validatePassengers(request.passengerDataIds, companyId);
    if (passengers.length !== request.passengerDataIds.length) {
      throw new Error('Some passengers not found');
    }

    if (!template.isPassengerCountValid(passengers.length)) {
      throw new Error(`Passenger count ${passengers.length} is not valid for this template (requires ${template.minPassengers}-${template.maxPassengers})`);
    }

    // Calculate pricing
    const isWeekend = this.isWeekend(request.departureDate);
    const isLastMinute = this.isLastMinute(request.departureDate);
    const calculatedPrice = template.calculatePrice(
      passengers.length,
      request.departureDate,
      isWeekend,
      isLastMinute,
      true // Apply corporate discount
    );

    // Add additional services
    const additionalServicesPrice = request.additionalServices?.reduce((sum, service) => sum + service.price, 0) || 0;
    const totalPrice = calculatedPrice + additionalServicesPrice;

    // Calculate discount
    const discountPercent = passengers.filter(p => p.isEligibleForDiscountedFare()).length > 0 ? 10 : 0;
    const discountAmount = totalPrice * (discountPercent / 100);
    const finalPrice = totalPrice - discountAmount;

    // Risk assessment
    const riskAssessment = {
      overallRiskScore: template.calculateRiskScore(),
      recommendations: template.requiresAdvanceBooking() ?
        ['Book in advance due to complexity or risk factors'] : []
    };

    // Check if confirmation and payment are required
    const confirmationRequired = template.riskLevel === RiskLevel.HIGH || template.riskLevel === RiskLevel.CRITICAL;
    const paymentRequired = finalPrice > 0;

    return {
      bookingId: this.generateBookingId(),
      template,
      bookingDetails: {
        passengerCount: passengers.length,
        calculatedPrice: totalPrice,
        discountApplied: discountAmount,
        finalPrice,
        currency: template.priceCurrency
      },
      estimatedDepartureTime: request.departureDate,
      estimatedArrivalTime: template.getEstimatedArrivalTime(request.departureDate),
      riskAssessment,
      confirmationRequired,
      paymentRequired
    };
  }

  async confirmBooking(bookingId: string, confirmedBy: string, companyId: string): Promise<void> {
    // This would implement the actual booking confirmation process
    // Including payment processing, ticket generation, etc.
    throw new Error('Booking confirmation not yet implemented');
  }

  // Bulk Operations
  async bulkCreateTemplates(templates: RouteTemplateCreateRequest[], createdBy: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      totalRequested: templates.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const templateData of templates) {
      try {
        await this.createTemplate(templateData, createdBy);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          templateId: templateData.templateName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async bulkUpdateTemplates(
    updates: Array<{ id: string; data: RouteTemplateUpdateRequest }>,
    updatedBy: string,
    companyId: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      totalRequested: updates.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const update of updates) {
      try {
        await this.updateTemplate(update.id, update.data, updatedBy, companyId);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          templateId: update.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async bulkDeleteTemplates(templateIds: string[], companyId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      totalRequested: templateIds.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const id of templateIds) {
      try {
        await this.deleteTemplate(id, companyId);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          templateId: id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Verification and Status Management
  async verifyTemplate(id: string, verifiedBy: string, notes?: string, companyId?: string): Promise<RouteTemplate> {
    const template = await this.getTemplateById(id, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    template.isVerified = true;
    template.verificationNotes = notes;
    template.updatedBy = verifiedBy;

    const savedTemplate = await this.routeTemplateRepository.update(template);
    return savedTemplate;
  }

  async toggleTemplateStatus(id: string, isActive: boolean, companyId: string): Promise<RouteTemplate> {
    const template = await this.getTemplateById(id, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    template.isActive = isActive;
    template.updatedBy = companyId;

    const savedTemplate = await this.routeTemplateRepository.update(template);
    return savedTemplate;
  }

  // Analytics and Statistics
  async getTemplateUsageStatistics(companyId: string): Promise<TemplateUsageStatistics> {
    const templates = await this.searchTemplates({ companyId });
    const activeTemplates = templates.templates.filter(t => t.isActive);
    const publicTemplates = templates.templates.filter(t => t.isPublicTemplate);
    const verifiedTemplates = templates.templates.filter(t => t.isVerified);

    // Calculate average popularity score
    const totalPopularity = templates.templates.reduce((sum, template) => sum + template.popularityScore, 0);
    const averagePopularityScore = templates.templates.length > 0 ? totalPopularity / templates.templates.length : 0;

    // Group by category
    const usageByCategory = templates.templates.reduce((acc, template) => {
      acc[template.templateCategory] = (acc[template.templateCategory] || 0) + template.usageCount;
      return acc;
    }, {} as Record<TemplateCategory, number>);

    // Group by risk level
    const usageByRiskLevel = templates.templates.reduce((acc, template) => {
      acc[template.riskLevel] = (acc[template.riskLevel] || 0) + template.usageCount;
      return acc;
    }, {} as Record<RiskLevel, number>);

    // Most used templates
    const mostUsedTemplates = templates.templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(template => ({
        templateId: template.id,
        templateName: template.templateName,
        usageCount: template.usageCount,
        popularityScore: template.popularityScore
      }));

    // Recent bookings (would query booking repository)
    const recentBookings: Array<{
      bookingId: string;
      templateId: string;
      templateName: string;
      departureDate: Date;
      passengerCount: number;
      price: number;
    }> = [];

    return {
      totalTemplates: templates.totalCount,
      activeTemplates: activeTemplates.length,
      publicTemplates: publicTemplates.length,
      verifiedTemplates: verifiedTemplates.length,
      averagePopularityScore,
      usageByCategory,
      usageByRiskLevel,
      mostUsedTemplates,
      recentBookings
    };
  }

  // Template Cloning and Sharing
  async cloneTemplate(id: string, newCompanyId: string, newName?: string): Promise<RouteTemplate> {
    const originalTemplate = await this.getTemplateById(id);
    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    if (!originalTemplate.isPublicTemplate) {
      throw new Error('Cannot clone private template');
    }

    const clonedTemplate = originalTemplate.cloneForCompany(newCompanyId);
    if (newName) {
      clonedTemplate.templateName = newName;
    }

    const savedTemplate = await this.routeTemplateRepository.create(clonedTemplate);
    return savedTemplate;
  }

  async makeTemplatePublic(id: string, companyId: string): Promise<RouteTemplate> {
    const template = await this.getTemplateById(id, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.isVerified) {
      throw new Error('Template must be verified before making public');
    }

    template.isPublicTemplate = true;
    const savedTemplate = await this.routeTemplateRepository.update(template);
    return savedTemplate;
  }

  // Template Recommendations
  async getTemplateRecommendations(
    companyId: string,
    criteria: {
      category?: TemplateCategory;
      riskLevel?: RiskLevel;
      maxPrice?: number;
      passengerCount?: number;
    }
  ): Promise<RouteTemplate[]> {
    // Get company's usage history to understand preferences
    const companyStats = await this.getTemplateUsageStatistics(companyId);

    // Get templates that match criteria
    const filter: RouteTemplateFilter = {
      isPublic: true,
      isVerified: true,
      isActive: true,
      category: criteria.category,
      riskLevel: criteria.riskLevel,
      maxPrice: criteria.maxPrice,
      limit: 20
    };

    const result = await this.searchTemplates(filter);

    // Score and rank templates
    const scoredTemplates = result.templates.map(template => {
      let score = template.popularityScore;

      // Boost for matching company's preferred categories
      if (companyStats.usageByCategory[template.templateCategory] > 0) {
        score += 2;
      }

      // Boost for suitable passenger capacity
      if (criteria.passengerCount && template.isPassengerCountValid(criteria.passengerCount)) {
        score += 1;
      }

      // Boost for low risk if company prefers safety
      if (companyStats.usageByRiskLevel[RiskLevel.LOW] > companyStats.usageByRiskLevel[RiskLevel.HIGH]) {
        if (template.riskLevel === RiskLevel.LOW) {
          score += 3;
        } else if (template.riskLevel === RiskLevel.MEDIUM) {
          score += 1;
        }
      }

      return { template, score };
    });

    return scoredTemplates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.template);
  }

  // Helper Methods
  private async validatePassengers(passengerIds: string[], companyId: string): Promise<any[]> {
    // This would validate passengers exist and belong to the company
    // For now, returning empty array as placeholder
    return [];
  }

  private async checkActiveBookings(templateId: string): Promise<boolean> {
    // This would check for active bookings
    // For now, returning false as placeholder
    return false;
  }

  private generateBookingId(): string {
    return `BOOKING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private isLastMinute(date: Date): boolean {
    const hoursUntilDeparture = (date.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilDeparture < 24;
  }

  // Export/Import Operations
  async exportTemplatesToCSV(companyId: string, filter?: RouteTemplateFilter): Promise<string> {
    const templates = await this.searchTemplates({
      companyId,
      ...filter,
      limit: 1000 // Reasonable limit for export
    });

    if (templates.templates.length === 0) {
      throw new Error('No templates found for export');
    }

    const headers = [
      'id', 'templateName', 'templateDescription', 'templateType', 'originPoint', 'destinationPoint',
      'transportTypes', 'estimatedDurationMinutes', 'estimatedDistanceKm', 'riskLevel',
      'maxPassengers', 'minPassengers', 'basePrice', 'currency', 'usageCount',
      'popularityScore', 'isActive', 'isVerified', 'isPublic', 'category', 'createdAt'
    ];

    const csvRows = [headers.join(',')];

    for (const template of templates.templates) {
      const csvRow = headers.map(header => {
        const value = (template as any)[header];
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value !== null && value !== undefined ? `"${value}"` : '';
      });
      csvRows.push(csvRow.join(','));
    }

    return csvRows.join('\n');
  }

  // Template Performance Analysis
  async analyzeTemplatePerformance(templateId: string, companyId?: string): Promise<{
    template: RouteTemplate;
    performanceMetrics: {
      totalBookings: number;
      successfulBookings: number;
      averageRating: number;
      averageProfit: number;
      seasonalUsage: Record<string, number>;
      riskEvents: number;
    };
    recommendations: string[];
    improvementOpportunities: string[];
  }> {
    const template = await this.getTemplateById(templateId, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    // This would analyze actual booking data, ratings, and performance metrics
    // For now, returning placeholder data
    return {
      template,
      performanceMetrics: {
        totalBookings: template.usageCount,
        successfulBookings: Math.floor(template.usageCount * 0.95),
        averageRating: 4.2,
        averageProfit: template.basePrice ? template.basePrice * 0.2 : 0,
        seasonalUsage: {
          'winter': template.usageCount * 0.3,
          'summer': template.usageCount * 0.4,
          'spring': template.usageCount * 0.2,
          'autumn': template.usageCount * 0.1
        },
        riskEvents: Math.floor(template.usageCount * 0.05)
      },
      recommendations: [
        'Consider increasing availability during high-demand seasons',
        'Optimize pricing based on seasonal demand patterns'
      ],
      improvementOpportunities: [
        'Add alternative routes for better reliability',
        'Implement dynamic pricing for peak periods'
      ]
    };
  }
}