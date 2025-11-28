import { Entity, BaseEntity } from './BaseEntity';
import { B2BCompany } from './B2BCompany';
import { B2BUser } from './B2BUser';

export interface RouteSegment {
  id: string;
  type: TransportType;
  from: string;
  to: string;
  distance: number; // km
  estimatedTime: number; // minutes
  riskLevel: RiskLevel;
  price?: number;
  currency?: string;
  provider?: string;
  departureTimes?: string[]; // ["08:00", "14:00", "20:00"]
  capacity?: number;
  equipment?: string[]; // ["winter_tires", "heating"]
}

export interface TransferPoint {
  name: string;
  coordinates?: { lat: number; lng: number };
  waitTimeMinutes: number;
  transferType: string; // "flight_to_bus", "bus_to_taxi", etc.
  facilities?: string[]; // ["waiting_room", "cafe", "restrooms"]
  riskLevel: RiskLevel;
  bufferTimeMinutes: number;
}

export interface RiskFactors {
  weatherDependency: number; // 0.0-1.0
  seasonal: boolean;
  roadQuality: 'excellent' | 'good' | 'medium' | 'poor';
  frequencyReliability: number; // 0.0-1.0
  infrastructureQuality: 'high' | 'medium' | 'low';
  trafficDependency: boolean;
}

export interface MultimodalSettings {
  autoBooking: boolean;
  connectionBufferMinutes: number;
  transferInsurance: boolean;
  realTimeTracking: boolean;
  alternativeTransportAllowed: boolean;
  weatherThresholds?: {
    windSpeedKmh?: number;
    temperatureC?: number;
    visibilityM?: number;
  };
}

export interface PriceVariations {
  weekendSurcharge: number; // multiplier
  seasonalSurcharge: number; // multiplier
  lastMinuteSurcharge: number; // multiplier
  groupDiscount: { minPassengers: number; discountPercent: number };
  corporateDiscountPercent: number;
}

export interface AlternativeTemplate {
  templateId?: string;
  description: string;
  priceDifference: string; // "+15%", "-10%"
  travelTimeDifference: string; // "+30min", "-15min"
  riskLevel: RiskLevel;
}

export enum TransportType {
  FLIGHT = 'flight',
  BUS = 'bus',
  TAXI = 'taxi',
  HELICOPTER = 'helicopter',
  RIVER = 'river',
  TRAIN = 'train',
  ALL_TERRAIN = 'all_terrain'
}

export enum TemplateType {
  SINGLE = 'single',
  MULTIMODAL = 'multimodal',
  ROUND_TRIP = 'round_trip'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TemplateCategory {
  BUSINESS = 'business',
  TRAINING = 'training',
  FIELD_WORK = 'field_work',
  EMERGENCY = 'emergency',
  CONFERENCE = 'conference',
  TEAM_BUILDING = 'team_building'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RoutePoint {
  name: string;
  coordinates?: Coordinates;
  type: 'city' | 'airport' | 'station' | 'port' | 'specific';
}

export class RouteTemplate extends BaseEntity {
  public companyId: string;
  public templateName: string;
  public templateDescription?: string;
  public templateType: TemplateType;

  // Route Information
  public originPoint: RoutePoint;
  public destinationPoint: RoutePoint;

  // Transport Characteristics
  public transportTypes: TransportType[];
  public estimatedDurationMinutes: number;
  public estimatedDistanceKm: number;

  // Transfer Information
  public hasTransfers: boolean;
  public transferPoints: TransferPoint[];

  // Risk Assessment
  public riskLevel: RiskLevel;
  public riskFactors: RiskFactors;

  // Capacity and Requirements
  public maxPassengers: number;
  public minPassengers: number;
  public accessibilitySupport: boolean;
  public specialRequirements: string[];

  // Schedule and Availability
  public isSeasonal: boolean;
  public seasonMonths: number[];
  public operatingDays: string[];
  public departureTimeConstraints: {
    earliest?: string;
    latest?: string;
    preferred?: string[];
  };

  // Pricing
  public basePrice?: number;
  public priceCurrency: string;
  public priceVariations: PriceVariations;
  public corporateDiscountAvailable: boolean;

  // Route Details
  public routeSegments: RouteSegment[];
  public alternativeTemplates: AlternativeTemplate[];

  // Statistics
  public usageCount: number;
  public popularityScore: number;
  public lastUsedDate?: Date;

  // Status
  public isActive: boolean;
  public isVerified: boolean;
  public verificationNotes?: string;

  // Sharing
  public isPublicTemplate: boolean;
  public templateCategory: TemplateCategory;

  // Integration
  public externalProviderReferences: Record<string, string>;

  // Advanced Features
  public multimodalSettings: MultimodalSettings;

  // Audit
  public createdBy?: string;
  public updatedBy?: string;

  // Relations
  public company?: B2BCompany;
  public creator?: B2BUser;

  constructor(data: Partial<RouteTemplate>) {
    super();
    Object.assign(this, data);
    this.ensureDefaults();
  }

  private ensureDefaults(): void {
    this.templateType = this.templateType || TemplateType.MULTIMODAL;
    this.transportTypes = this.transportTypes || [];
    this.riskLevel = this.riskLevel || RiskLevel.MEDIUM;
    this.maxPassengers = this.maxPassengers || 50;
    this.minPassengers = this.minPassengers || 1;
    this.accessibilitySupport = this.accessibilitySupport || false;
    this.specialRequirements = this.specialRequirements || [];
    this.isSeasonal = this.isSeasonal || false;
    this.seasonMonths = this.seasonMonths || [];
    this.operatingDays = this.operatingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    this.departureTimeConstraints = this.departureTimeConstraints || {};
    this.priceCurrency = this.priceCurrency || 'RUB';
    this.corporateDiscountAvailable = this.corporateDiscountAvailable !== false;
    this.hasTransfers = this.hasTransfers || false;
    this.transferPoints = this.transferPoints || [];
    this.riskFactors = this.riskFactors || {
      weatherDependency: 0.3,
      seasonal: false,
      roadQuality: 'medium',
      frequencyReliability: 0.8,
      infrastructureQuality: 'medium',
      trafficDependency: false
    };
    this.priceVariations = this.priceVariations || {
      weekendSurcharge: 1.0,
      seasonalSurcharge: 1.0,
      lastMinuteSurcharge: 1.0,
      groupDiscount: { minPassengers: 10, discountPercent: 10 },
      corporateDiscountPercent: 5
    };
    this.routeSegments = this.routeSegments || [];
    this.alternativeTemplates = this.alternativeTemplates || [];
    this.usageCount = this.usageCount || 0;
    this.popularityScore = this.popularityScore || 0.0;
    this.isActive = this.isActive !== false;
    this.isVerified = this.isVerified || false;
    this.isPublicTemplate = this.isPublicTemplate || false;
    this.templateCategory = this.templateCategory || TemplateCategory.BUSINESS;
    this.externalProviderReferences = this.externalProviderReferences || {};
    this.multimodalSettings = this.multimodalSettings || {
      autoBooking: false,
      connectionBufferMinutes: 60,
      transferInsurance: false,
      realTimeTracking: false,
      alternativeTransportAllowed: true
    };
  }

  // Template Validation
  public validate(): string[] {
    const errors: string[] = [];

    // Required fields
    if (!this.templateName?.trim()) errors.push('Template name is required');
    if (!this.companyId) errors.push('Company ID is required');
    if (!this.originPoint?.name?.trim()) errors.push('Origin point is required');
    if (!this.destinationPoint?.name?.trim()) errors.push('Destination point is required');

    // Transport validation
    if (!this.transportTypes.length) errors.push('At least one transport type is required');
    if (this.transportTypes.some(type => !Object.values(TransportType).includes(type))) {
      errors.push('Invalid transport type detected');
    }

    // Duration and distance
    if (!this.estimatedDurationMinutes || this.estimatedDurationMinutes <= 0) {
      errors.push('Estimated duration must be positive');
    }
    if (!this.estimatedDistanceKm || this.estimatedDistanceKm <= 0) {
      errors.push('Estimated distance must be positive');
    }

    // Passenger capacity
    if (this.minPassengers < 1) errors.push('Minimum passengers must be at least 1');
    if (this.maxPassengers < this.minPassengers) {
      errors.push('Maximum passengers must be greater than minimum passengers');
    }

    // Route segments validation
    if (!this.routeSegments.length) errors.push('At least one route segment is required');

    this.routeSegments.forEach((segment, index) => {
      if (!segment.from?.trim()) errors.push(`Segment ${index + 1}: From location is required`);
      if (!segment.to?.trim()) errors.push(`Segment ${index + 1}: To location is required`);
      if (!segment.estimatedTime || segment.estimatedTime <= 0) {
        errors.push(`Segment ${index + 1}: Estimated time must be positive`);
      }
    });

    // Season validation
    if (this.isSeasonal && (!this.seasonMonths.length || this.seasonMonths.length === 12)) {
      errors.push('Seasonal templates must have specific months defined');
    }

    // Operating days validation
    if (!this.operatingDays.length) errors.push('At least one operating day is required');

    // Risk validation
    if (!Object.values(RiskLevel).includes(this.riskLevel)) {
      errors.push('Invalid risk level');
    }

    return errors;
  }

  // Check if template is available for specific date
  public isAvailableForDate(date: Date): boolean {
    if (!this.isActive) return false;

    // Check seasonal availability
    if (this.isSeasonal) {
      const month = date.getMonth() + 1; // getMonth() is 0-indexed
      if (!this.seasonMonths.includes(month)) return false;
    }

    // Check operating day
    const dayOfWeek = date.toLocaleLowerCase('en-US', { weekday: 'long' });
    if (!this.operatingDays.includes(dayOfWeek)) return false;

    return true;
  }

  // Calculate price for specific parameters
  public calculatePrice(
    passengerCount: number,
    departureDate: Date,
    isWeekend: boolean = false,
    isLastMinute: boolean = false,
    applyCorporateDiscount: boolean = false
  ): number {
    if (!this.basePrice) return 0;

    let price = this.basePrice * passengerCount;

    // Apply weekend surcharge
    if (isWeekend) {
      price *= this.priceVariations.weekendSurcharge;
    }

    // Apply seasonal surcharge
    if (this.isSeasonal) {
      price *= this.priceVariations.seasonalSurcharge;
    }

    // Apply last minute surcharge
    if (isLastMinute) {
      price *= this.priceVariations.lastMinuteSurcharge;
    }

    // Apply group discount
    if (passengerCount >= this.priceVariations.groupDiscount.minPassengers) {
      price *= (1 - this.priceVariations.groupDiscount.discountPercent / 100);
    }

    // Apply corporate discount
    if (applyCorporateDiscount && this.corporateDiscountAvailable) {
      price *= (1 - this.priceVariations.corporateDiscountPercent / 100);
    }

    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }

  // Get estimated arrival time
  public getEstimatedArrivalTime(departureTime: Date): Date {
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + this.estimatedDurationMinutes);
    return arrivalTime;
  }

  // Check if passenger count is within limits
  public isPassengerCountValid(passengerCount: number): boolean {
    return passengerCount >= this.minPassengers && passengerCount <= this.maxPassengers;
  }

  // Get total risk score (0.0-1.0)
  public calculateRiskScore(): number {
    const riskScore = {
      [RiskLevel.LOW]: 0.1,
      [RiskLevel.MEDIUM]: 0.3,
      [RiskLevel.HIGH]: 0.6,
      [RiskLevel.CRITICAL]: 0.9
    };

    let baseScore = riskScore[this.riskLevel];

    // Add weather dependency factor
    baseScore += this.riskFactors.weatherDependency * 0.3;

    // Subtract for good reliability
    baseScore -= (1 - this.riskFactors.frequencyReliability) * 0.2;

    // Adjust for infrastructure quality
    const infrastructureScore = {
      high: 0.0,
      medium: 0.1,
      low: 0.2
    };
    baseScore += infrastructureScore[this.riskFactors.infrastructureQuality];

    return Math.max(0.0, Math.min(1.0, baseScore));
  }

  // Check if template requires advance booking
  public requiresAdvanceBooking(): boolean {
    return (
      this.riskFactors.weatherDependency > 0.7 ||
      this.riskLevel === RiskLevel.HIGH ||
      this.riskLevel === RiskLevel.CRITICAL ||
      this.hasTransfers
    );
  }

  // Get recommended booking window in days
  public getRecommendedBookingWindowDays(): number {
    if (!this.requiresAdvanceBooking()) return 1;

    if (this.riskLevel === RiskLevel.CRITICAL) return 14;
    if (this.riskLevel === RiskLevel.HIGH) return 7;
    if (this.hasTransfers) return 3;
    if (this.isSeasonal) return 5;

    return 2;
  }

  // Check if suitable for VIP passengers
  public isSuitableForVip(): boolean {
    return (
      this.riskLevel !== RiskLevel.CRITICAL &&
      this.riskFactors.infrastructureQuality !== 'low' &&
      this.accessibilitySupport
    );
  }

  // Update usage statistics
  public updateUsage(passengerCount: number): void {
    this.usageCount += 1;
    this.lastUsedDate = new Date();

    // Update popularity score based on recent usage
    const daysSinceLastUse = this.lastUsedDate ?
      (Date.now() - this.lastUsedDate.getTime()) / (1000 * 60 * 60 * 24) : 999;

    const recencyBonus = daysSinceLastUse < 30 ? 3.0 :
                        daysSinceLastUse < 90 ? 1.5 : 0.0;

    this.popularityScore = Math.max(0.0, Math.min(10.0,
      5.0 + (this.usageCount * 0.1) + recencyBonus
    ));
  }

  // Get safe segments for public templates
  public getSafeSegments(): Partial<RouteSegment>[] {
    return this.routeSegments.map(segment => ({
      id: segment.id,
      type: segment.type,
      from: segment.from,
      to: segment.to,
      distance: segment.distance,
      estimatedTime: segment.estimatedTime,
      riskLevel: segment.riskLevel,
      // Exclude sensitive pricing and provider info for public templates
      capacity: segment.capacity
    }));
  }

  // Export to booking format
  public toBookingFormat(): Partial<RouteTemplate> {
    return {
      id: this.id,
      templateName: this.templateName,
      templateDescription: this.templateDescription,
      originPoint: this.originPoint,
      destinationPoint: this.destinationPoint,
      transportTypes: this.transportTypes,
      estimatedDurationMinutes: this.estimatedDurationMinutes,
      estimatedDistanceKm: this.estimatedDistanceKm,
      hasTransfers: this.hasTransfers,
      riskLevel: this.riskLevel,
      maxPassengers: this.maxPassengers,
      minPassengers: this.minPassengers,
      accessibilitySupport: this.accessibilitySupport,
      routeSegments: this.getSafeSegments(),
      priceVariations: this.priceVariations,
      corporateDiscountAvailable: this.corporateDiscountAvailable,
      requiresAdvanceBooking: this.requiresAdvanceBooking(),
      recommendedBookingWindowDays: this.getRecommendedBookingWindowDays()
    };
  }

  // Clone template for new company
  public cloneForCompany(newCompanyId: string): RouteTemplate {
    const cloned = new RouteTemplate({
      ...this,
      id: undefined,
      companyId: newCompanyId,
      usageCount: 0,
      popularityScore: 0.0,
      lastUsedDate: undefined,
      isPublicTemplate: false,
      isVerified: false,
      verificationNotes: undefined,
      createdAt: undefined,
      updatedAt: undefined
    });
    return cloned;
  }

  // Search relevance score for query matching
  public calculateRelevanceScore(query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0.0;

    // Exact name match
    if (this.templateName.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // Origin/destination match
    if (this.originPoint.name.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }
    if (this.destinationPoint.name.toLowerCase().includes(lowerQuery)) {
      score += 8;
    }

    // Transport type match
    if (this.transportTypes.some(type => type.toLowerCase().includes(lowerQuery))) {
      score += 5;
    }

    // Description match
    if (this.templateDescription?.toLowerCase().includes(lowerQuery)) {
      score += 3;
    }

    // Boost popular templates
    score += this.popularityScore * 0.1;

    // Boost verified templates
    if (this.isVerified) {
      score += 2;
    }

    return score;
  }

  // Export to CSV-friendly format
  public toCsvRow(): Record<string, string | null> {
    return {
      id: this.id || '',
      templateName: this.templateName || '',
      description: this.templateDescription || null,
      type: this.templateType,
      origin: this.originPoint?.name || '',
      destination: this.destinationPoint?.name || '',
      transportTypes: this.transportTypes.join(', '),
      durationMinutes: this.estimatedDurationMinutes.toString(),
      distanceKm: this.estimatedDistanceKm.toString(),
      riskLevel: this.riskLevel,
      maxPassengers: this.maxPassengers.toString(),
      minPassengers: this.minPassengers.toString(),
      basePrice: this.basePrice?.toString() || null,
      currency: this.priceCurrency,
      usageCount: this.usageCount.toString(),
      popularityScore: this.popularityScore.toString(),
      isActive: this.isActive ? 'Yes' : 'No',
      isVerified: this.isVerified ? 'Yes' : 'No',
      isPublic: this.isPublicTemplate ? 'Yes' : 'No',
      category: this.templateCategory,
      createdAt: this.createdAt ? this.createdAt.toISOString() : ''
    };
  }
}