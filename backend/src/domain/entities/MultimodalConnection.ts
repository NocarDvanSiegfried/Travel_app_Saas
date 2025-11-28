import { Entity, BaseEntity } from './BaseEntity';

export interface ConnectionPoint {
  name: string;
  coordinates: { lat: number; lng: number };
  type: 'airport' | 'bus_station' | 'train_station' | 'river_port' | 'helipad' | 'taxi_stand';
}

export interface WaitingFacilities {
  heatedWaitingRoom: boolean;
  cafe: boolean;
  restrooms: boolean;
  luggageStorage: boolean;
  wifi: boolean;
  accessibilityAccess: boolean;
}

export interface RiskFactors {
  weatherSensitivity: number; // 0.0-1.0
  trafficDependent: boolean;
  seasonalIssues: string[]; // ["winter", "summer_breakup", "spring_thaw"]
  infrastructureQuality: 'high' | 'medium' | 'low';
  frequencyReliability: number; // 0.0-1.0
  alternativeRouteAvailable: boolean;
  localKnowledgeRequired: boolean;
}

export interface AlternativeConnection {
  point: string;
  coordinates?: { lat: number; lng: number };
  additionalTimeMinutes: number;
  riskLevel: RiskLevel;
  description: string;
  requiresAdditionalTransport: boolean;
}

export interface SeasonalAvailability {
  winter: 'full' | 'limited' | 'unavailable';
  summer: 'full' | 'limited' | 'unavailable';
  springBreakup: 'full' | 'limited' | 'unavailable';
  autumn: 'full' | 'limited' | 'unavailable';
}

export interface OperatingHours {
  opens: string; // "06:00"
  closes: string; // "22:00"
  breaks?: Array<{
    start: string;
    end: string;
  }>;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
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

export enum DataConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export class MultimodalConnection extends BaseEntity {
  public connectionPoint: ConnectionPoint;

  // Segment Types
  public fromSegmentType: TransportType;
  public toSegmentType: TransportType;

  // Time Characteristics
  public minConnectionTimeMinutes: number;
  public recommendedConnectionTimeMinutes: number;
  public maxSafeConnectionTimeMinutes?: number;

  // Risk Assessment
  public connectionRiskLevel: RiskLevel;
  public delayProbability: number; // 0.00-1.00
  public averageDelayMinutes: number;
  public riskFactors: RiskFactors;

  // Alternatives
  public alternativeConnections: AlternativeConnection[];

  // Infrastructure
  public hasWaitingFacilities: boolean;
  public waitingFacilities: WaitingFacilities;
  public accessibilitySupport: boolean;

  // Availability
  public seasonalAvailability: SeasonalAvailability;
  public operatingHours: OperatingHours;

  // Statistics
  public successRate: number; // 0.00-1.00
  public dataConfidenceLevel: DataConfidenceLevel;

  constructor(data: Partial<MultimodalConnection>) {
    super();
    Object.assign(this, data);
    this.ensureDefaults();
  }

  private ensureDefaults(): void {
    this.connectionRiskLevel = this.connectionRiskLevel || RiskLevel.MEDIUM;
    this.delayProbability = this.delayProbability ?? 0.1;
    this.averageDelayMinutes = this.averageDelayMinutes ?? 0;
    this.riskFactors = this.riskFactors || {
      weatherSensitivity: 0.3,
      trafficDependent: false,
      seasonalIssues: [],
      infrastructureQuality: 'medium',
      frequencyReliability: 0.8,
      alternativeRouteAvailable: false,
      localKnowledgeRequired: false
    };
    this.alternativeConnections = this.alternativeConnections || [];
    this.hasWaitingFacilities = this.hasWaitingFacilities || false;
    this.waitingFacilities = this.waitingFacilities || {
      heatedWaitingRoom: false,
      cafe: false,
      restrooms: false,
      luggageStorage: false,
      wifi: false,
      accessibilityAccess: false
    };
    this.accessibilitySupport = this.accessibilitySupport || false;
    this.seasonalAvailability = this.seasonalAvailability || {
      winter: 'limited',
      summer: 'full',
      springBreakup: 'limited',
      autumn: 'full'
    };
    this.operatingHours = this.operatingHours || {
      opens: '06:00',
      closes: '22:00'
    };
    this.successRate = this.successRate ?? 0.95;
    this.dataConfidenceLevel = this.dataConfidenceLevel || DataConfidenceLevel.MEDIUM;
  }

  // Validation
  public validate(): string[] {
    const errors: string[] = [];

    // Required fields
    if (!this.connectionPoint?.name?.trim()) errors.push('Connection point name is required');
    if (!this.connectionPoint?.coordinates?.lat || !this.connectionPoint?.coordinates?.lng) {
      errors.push('Connection point coordinates are required');
    }
    if (!Object.values(TransportType).includes(this.fromSegmentType)) {
      errors.push('Invalid from segment type');
    }
    if (!Object.values(TransportType).includes(this.toSegmentType)) {
      errors.push('Invalid to segment type');
    }

    // Time validation
    if (!this.minConnectionTimeMinutes || this.minConnectionTimeMinutes <= 0) {
      errors.push('Minimum connection time must be positive');
    }
    if (!this.recommendedConnectionTimeMinutes || this.recommendedConnectionTimeMinutes <= 0) {
      errors.push('Recommended connection time must be positive');
    }
    if (this.maxSafeConnectionTimeMinutes && this.maxSafeConnectionTimeMinutes <= this.recommendedConnectionTimeMinutes) {
      errors.push('Max safe connection time must be greater than recommended time');
    }

    // Probability validation
    if (this.delayProbability < 0 || this.delayProbability > 1) {
      errors.push('Delay probability must be between 0 and 1');
    }

    // Success rate validation
    if (this.successRate < 0 || this.successRate > 1) {
      errors.push('Success rate must be between 0 and 1');
    }

    // Risk factors validation
    if (this.riskFactors.weatherSensitivity < 0 || this.riskFactors.weatherSensitivity > 1) {
      errors.push('Weather sensitivity must be between 0 and 1');
    }
    if (this.riskFactors.frequencyReliability < 0 || this.riskFactors.frequencyReliability > 1) {
      errors.push('Frequency reliability must be between 0 and 1');
    }

    return errors;
  }

  // Check if connection is available at specific time
  public isAvailableAt(dateTime: Date): boolean {
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    const currentTimeInMinutes = hour * 60 + minute;

    // Parse operating hours
    const [opensHour, opensMinute] = this.operatingHours.opens.split(':').map(Number);
    const [closesHour, closesMinute] = this.operatingHours.closes.split(':').map(Number);
    const opensTimeInMinutes = opensHour * 60 + opensMinute;
    const closesTimeInMinutes = closesHour * 60 + closesMinute;

    // Check if within operating hours
    if (currentTimeInMinutes < opensTimeInMinutes || currentTimeInMinutes > closesTimeInMinutes) {
      return false;
    }

    // Check seasonal availability
    const month = dateTime.getMonth() + 1; // getMonth() is 0-indexed
    const season = this.getCurrentSeason(month);
    const seasonAvailability = this.seasonalAvailability[season];

    return seasonAvailability === 'full' || seasonAvailability === 'limited';
  }

  private getCurrentSeason(month: number): keyof SeasonalAvailability {
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 4) return 'springBreakup';
    if (month >= 5 && month <= 8) return 'summer';
    return 'autumn';
  }

  // Calculate connection risk score for specific date/time
  public calculateRiskScore(dateTime: Date, weatherForecast?: any): number {
    let riskScore = {
      [RiskLevel.LOW]: 0.1,
      [RiskLevel.MEDIUM]: 0.3,
      [RiskLevel.HIGH]: 0.6,
      [RiskLevel.CRITICAL]: 0.9
    }[this.connectionRiskLevel];

    // Adjust for seasonal factors
    const month = dateTime.getMonth() + 1;
    const season = this.getCurrentSeason(month);
    const seasonAvailability = this.seasonalAvailability[season];

    if (seasonAvailability === 'limited') {
      riskScore += 0.2;
    } else if (seasonAvailability === 'unavailable') {
      riskScore += 0.5;
    }

    // Adjust for time of day (higher risk during off-hours)
    const hour = dateTime.getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.1;
    }

    // Weather impact
    if (weatherForecast) {
      riskScore += this.riskFactors.weatherSensitivity * this.getWeatherRiskMultiplier(weatherForecast);
    }

    return Math.max(0.0, Math.min(1.0, riskScore));
  }

  private getWeatherRiskMultiplier(weatherForecast: any): number {
    // Simplified weather risk calculation
    // In real implementation, this would use detailed weather data
    if (weatherForecast?.windSpeedKmh > 50) return 0.4;
    if (weatherForecast?.visibilityM < 1000) return 0.3;
    if (weatherForecast?.temperatureC < -40) return 0.2;

    return 0.1;
  }

  // Get recommended buffer time for specific connection
  public getRecommendedBufferTime(riskTolerance: 'low' | 'medium' | 'high' = 'medium'): number {
    let buffer = this.recommendedConnectionTimeMinutes;

    // Adjust based on risk tolerance
    const riskMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 1.5
    };

    buffer *= riskMultipliers[riskTolerance];

    // Add weather buffer
    buffer += this.riskFactors.weatherSensitivity * 30;

    // Add infrastructure buffer
    const infrastructureBuffers = {
      high: 0,
      medium: 15,
      low: 30
    };
    buffer += infrastructureBuffers[this.riskFactors.infrastructureQuality];

    return Math.round(buffer);
  }

  // Check if connection requires special arrangements
  public requiresSpecialArrangements(): boolean {
    return (
      this.riskFactors.localKnowledgeRequired ||
      this.riskFactors.infrastructureQuality === 'low' ||
      this.connectionRiskLevel === RiskLevel.CRITICAL ||
      this.delayProbability > 0.5
    );
  }

  // Get probability of successful connection within time window
  public getSuccessProbability(timeWindowMinutes: number): number {
    if (timeWindowMinutes >= this.maxSafeConnectionTimeMinutes) {
      return this.successRate;
    }

    // Linear interpolation between min and max safe times
    const minTime = this.minConnectionTimeMinutes;
    const maxTime = this.maxSafeConnectionTimeMinutes || this.recommendedConnectionTimeMinutes * 2;

    if (timeWindowMinutes <= minTime) {
      return 0.1; // Very low probability for insufficient time
    }

    const ratio = (timeWindowMinutes - minTime) / (maxTime - minTime);
    return Math.max(0.1, Math.min(1.0, this.successRate * ratio));
  }

  // Update risk assessment based on performance data
  public updateRiskAssessment(performanceData: {
    totalConnections: number;
    successfulConnections: number;
    averageDelayMinutes: number;
    recentFailures: number;
  }): void {
    // Update success rate
    this.successRate = performanceData.successfulConnections / performanceData.totalConnections;

    // Update average delay
    this.averageDelayMinutes = performanceData.averageDelayMinutes;

    // Update delay probability
    this.delayProbability = Math.max(0, Math.min(1, performanceData.averageDelayMinutes / 60));

    // Adjust risk level based on performance
    if (this.successRate > 0.95 && this.averageDelayMinutes < 10) {
      this.connectionRiskLevel = RiskLevel.LOW;
    } else if (this.successRate < 0.8 || this.averageDelayMinutes > 30) {
      this.connectionRiskLevel = RiskLevel.HIGH;
    } else if (this.successRate < 0.6 || performanceData.recentFailures > 3) {
      this.connectionRiskLevel = RiskLevel.CRITICAL;
    } else {
      this.connectionRiskLevel = RiskLevel.MEDIUM;
    }
  }

  // Get alternative connection for risk mitigation
  public getBestAlternative(currentWeather?: any): AlternativeConnection | null {
    if (!this.alternativeConnections.length) {
      return null;
    }

    return this.alternativeConnections.reduce((best, current) => {
      const currentRisk = {
        [RiskLevel.LOW]: 0.1,
        [RiskLevel.MEDIUM]: 0.3,
        [RiskLevel.HIGH]: 0.6,
        [RiskLevel.CRITICAL]: 0.9
      }[current.riskLevel];

      const bestRisk = {
        [RiskLevel.LOW]: 0.1,
        [RiskLevel.MEDIUM]: 0.3,
        [RiskLevel.HIGH]: 0.6,
        [RiskLevel.CRITICAL]: 0.9
      }[best.riskLevel];

      // Prefer lower risk and less additional time
      const currentScore = currentRisk + (current.additionalTimeMinutes / 60);
      const bestScore = bestRisk + (best.additionalTimeMinutes / 60);

      return currentScore < bestScore ? current : best;
    });
  }

  // Export to safe format (without sensitive operational details)
  public toSafeFormat(): Partial<MultimodalConnection> {
    return {
      id: this.id,
      connectionPoint: this.connectionPoint,
      fromSegmentType: this.fromSegmentType,
      toSegmentType: this.toSegmentType,
      minConnectionTimeMinutes: this.minConnectionTimeMinutes,
      recommendedConnectionTimeMinutes: this.recommendedConnectionTimeMinutes,
      connectionRiskLevel: this.connectionRiskLevel,
      hasWaitingFacilities: this.hasWaitingFacilities,
      accessibilitySupport: this.accessibilitySupport,
      successRate: this.successRate
    };
  }

  // Create connection risk analysis
  public createRiskAnalysis(departureTime: Date, weatherForecast?: any): {
    riskScore: number;
    riskLevel: RiskLevel;
    recommendedBufferMinutes: number;
    successProbability: number;
    hasAlternatives: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const riskScore = this.calculateRiskScore(departureTime, weatherForecast);
    const riskLevel = riskScore < 0.3 ? RiskLevel.LOW :
                     riskScore < 0.6 ? RiskLevel.MEDIUM :
                     riskScore < 0.8 ? RiskLevel.HIGH : RiskLevel.CRITICAL;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Generate warnings
    if (this.connectionRiskLevel === RiskLevel.CRITICAL) {
      warnings.push('High-risk connection point - consider alternative route');
    }
    if (this.delayProbability > 0.3) {
      warnings.push('High probability of delays - allow extra buffer time');
    }
    if (!this.hasWaitingFacilities) {
      warnings.push('No waiting facilities available');
    }
    if (!this.isAvailableAt(departureTime)) {
      warnings.push('Connection point may be closed at this time');
    }

    // Generate recommendations
    if (this.riskFactors.weatherSensitivity > 0.7) {
      recommendations.push('Check weather conditions before departure');
    }
    if (this.requiresSpecialArrangements()) {
      recommendations.push('Arrange for local guide or support');
    }
    if (this.alternativeConnections.length > 0) {
      recommendations.push('Have alternative route planned');
    }
    recommendations.push(`Use ${this.getRecommendedBufferTime()} minutes buffer time`);

    return {
      riskScore,
      riskLevel,
      recommendedBufferMinutes: this.getRecommendedBufferTime(),
      successProbability: this.getSuccessProbability(this.recommendedConnectionTimeMinutes),
      hasAlternatives: this.alternativeConnections.length > 0,
      warnings,
      recommendations
    };
  }

  // Calculate total journey time including buffers
  public calculateTotalJourneyTime(
    segment1TimeMinutes: number,
    segment2TimeMinutes: number,
    riskTolerance: 'low' | 'medium' | 'high' = 'medium'
  ): {
    totalTimeMinutes: number;
    connectionTimeMinutes: number;
    bufferTimeMinutes: number;
    riskAdjustedTotalMinutes: number;
  } {
    const connectionTime = this.recommendedConnectionTimeMinutes;
    const bufferTime = this.getRecommendedBufferTime(riskTolerance);
    const riskMultiplier = 1 + (this.delayProbability * 0.5); // Add 50% of delay probability as buffer

    return {
      totalTimeMinutes: segment1TimeMinutes + connectionTime + segment2TimeMinutes,
      connectionTimeMinutes: connectionTime,
      bufferTimeMinutes: bufferTime,
      riskAdjustedTotalMinutes: Math.round(
        (segment1TimeMinutes + connectionTime + bufferTime + segment2TimeMinutes) * riskMultiplier
      )
    };
  }
}