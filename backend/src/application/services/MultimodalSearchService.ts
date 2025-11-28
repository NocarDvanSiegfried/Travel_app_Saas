import { RouteTemplate } from '../../domain/entities/RouteTemplate';
import { MultimodalConnection, TransportType, RiskLevel } from '../../domain/entities/MultimodalConnection';

export interface SearchRequest {
  origin: string;
  destination: string;
  departureDate?: Date;
  returnDate?: Date;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  transportPreferences?: TransportType[];
  maxStops?: number;
  maxPrice?: number;
  currency?: string;
  riskTolerance?: 'low' | 'medium' | 'high';
  timePreference?: 'fastest' | 'cheapest' | 'balanced';
  accessibilityRequired?: boolean;
  vipRequired?: boolean;
  benefitsRequired?: boolean;
}

export interface RouteOption {
  id: string;
  name: string;
  description: string;
  totalDurationMinutes: number;
  totalPrice: number;
  currency: string;
  riskLevel: RiskLevel;
  riskScore: number;
  segments: RouteSegment[];
  connections: ConnectionInfo[];
  transportTypes: TransportType[];
  departureTime: Date;
  arrivalTime: Date;
  passengerCapacity: number;
  accessibilitySupport: boolean;
  vipAvailable: boolean;
  discountAvailable: boolean;
  bookingConfidence: number; // 0.0-1.0
  carbonFootprintKg: number;
  weatherDependency: number; // 0.0-1.0
  seasonalRestrictions?: string[];
  alternativeOptions?: AlternativeRouteOption[];
}

export interface RouteSegment {
  id: string;
  type: TransportType;
  from: string;
  to: string;
  departureTime: Date;
  arrivalTime: Date;
  durationMinutes: number;
  distanceKm: number;
  price: number;
  currency: string;
  provider: string;
  vehicleNumber?: string;
  capacity: number;
  availableSeats: number;
  amenities: string[];
  riskLevel: RiskLevel;
  weatherSensitivity: number;
  accessible: boolean;
  vipAvailable: boolean;
  discountEligible: boolean;
  realTimeTracking: boolean;
}

export interface ConnectionInfo {
  id: string;
  location: string;
  arrivalTime: Date;
  nextDepartureTime: Date;
  connectionTimeMinutes: number;
  bufferTimeMinutes: number;
  riskLevel: RiskLevel;
  riskScore: number;
  successProbability: number;
  hasWaitingFacilities: boolean;
  accessibilitySupport: boolean;
  weatherRisk: number;
  alternativeLocation?: string;
  additionalTimeMinutes?: number;
}

export interface AlternativeRouteOption {
  id: string;
  name: string;
  priceDifference: number;
  priceDifferencePercent: number;
  timeDifference: number;
  riskDifference: number;
  description: string;
  reason: string;
}

export interface SearchResult {
  options: RouteOption[];
  totalResults: number;
  searchMetadata: {
    searchId: string;
    query: SearchRequest;
    searchDurationMs: number;
    dataFreshness: Date;
    riskConsiderations: string[];
    recommendations: string[];
  };
  filters: {
    transportTypes: TransportType[];
    priceRange: { min: number; max: number };
    durationRange: { min: number; max: number };
    riskLevels: RiskLevel[];
  };
}

export interface SmartConnectionRequest {
  origin: string;
  destination: string;
  plannedDepartureTime: Date;
  transportTypes: TransportType[];
  riskTolerance: 'low' | 'medium' | 'high';
  maxTotalTime: number;
  maxConnections?: number;
  considerWeather: boolean;
  weatherForecast?: any;
  realTimeData: boolean;
}

export interface SmartConnectionResponse {
  connections: ConnectionPlan[];
  riskAssessment: {
    overallRiskScore: number;
    riskFactors: string[];
    recommendations: string[];
    weatherWarnings: string[];
  };
  alternatives: ConnectionPlan[];
}

export interface ConnectionPlan {
  id: string;
  segments: RouteSegment[];
  connections: ConnectionInfo[];
  totalTimeMinutes: number;
  totalPrice: number;
  riskScore: number;
  successProbability: number;
  requiresSpecialArrangements: boolean;
  lastUpdated: Date;
}

export class MultimodalSearchService {
  constructor(
    private readonly routeTemplateRepository: any,
    private readonly multimodalConnectionRepository: any,
    private readonly externalProviderService: any,
    private readonly riskAnalysisService: any,
    private readonly weatherService: any
  ) {}

  // Main search method
  async searchRoutes(request: SearchRequest): Promise<SearchResult> {
    const searchId = this.generateSearchId();
    const startTime = Date.now();

    try {
      // Validate request
      this.validateSearchRequest(request);

      // Get route templates
      const templates = await this.findRelevantTemplates(request);

      // Get available connections
      const connections = await this.findAvailableConnections(request);

      // Build route options
      const options = await this.buildRouteOptions(templates, connections, request);

      // Sort and rank options
      const rankedOptions = await this.rankRouteOptions(options, request);

      // Add alternatives
      const optionsWithAlternatives = await this.addAlternatives(rankedOptions, request);

      const searchDuration = Date.now() - startTime;

      return {
        options: optionsWithAlternatives,
        totalResults: optionsWithAlternatives.length,
        searchMetadata: {
          searchId,
          query: request,
          searchDurationMs: searchDuration,
          dataFreshness: new Date(),
          riskConsiderations: this.extractRiskConsiderations(optionsWithAlternatives),
          recommendations: this.generateRecommendations(request, optionsWithAlternatives)
        },
        filters: this.generateFilters(optionsWithAlternatives)
      };
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Smart connection planning
  async planSmartConnection(request: SmartConnectionRequest): Promise<SmartConnectionResponse> {
    try {
      // Get available connections between points
      const availableConnections = await this.multimodalConnectionRepository
        .findByRoute(request.origin, request.destination);

      // Filter by transport types and risk tolerance
      const filteredConnections = this.filterConnectionsByPreferences(
        availableConnections,
        request
      );

      // Generate connection plans
      const connectionPlans = await this.generateConnectionPlans(filteredConnections, request);

      // Analyze risks for each plan
      const riskAnalyzedPlans = await this.analyzePlanRisks(connectionPlans, request);

      // Get weather data if requested
      let weatherData = null;
      if (request.considerWeather) {
        weatherData = await this.weatherService.getForecast(
          request.origin,
          request.destination,
          request.plannedDepartureTime
        );
      }

      // Risk assessment
      const riskAssessment = await this.performRiskAssessment(
        riskAnalyzedPlans,
        request,
        weatherData
      );

      return {
        connections: riskAnalyzedPlans,
        riskAssessment,
        alternatives: await this.generateAlternativePlans(riskAnalyzedPlans, request)
      };
    } catch (error) {
      console.error('Smart connection planning error:', error);
      throw new Error(`Connection planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get real-time connection status
  async getConnectionStatus(connectionId: string): Promise<{
    connectionId: string;
    status: 'operational' | 'delayed' | 'disrupted' | 'closed';
    currentDelayMinutes: number;
    estimatedRecoveryTime?: Date;
    alternativeRouteAvailable: boolean;
    weatherImpact: number;
    lastUpdated: Date;
    recommendations: string[];
  }> {
    try {
      const connection = await this.multimodalConnectionRepository.findById(connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Get real-time data from external providers
      const realTimeData = await this.externalProviderService.getConnectionStatus(connectionId);

      // Get current weather
      const weatherData = await this.weatherService.getCurrentWeather(
        connection.connectionPoint.coordinates.lat,
        connection.connectionPoint.coordinates.lng
      );

      // Calculate status
      const status = this.determineConnectionStatus(connection, realTimeData, weatherData);

      return {
        connectionId,
        ...status,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Connection status error:', error);
      throw new Error(`Failed to get connection status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get risk analysis for specific route
  async getRouteRiskAnalysis(
    origin: string,
    destination: string,
    departureTime: Date,
    transportTypes: TransportType[]
  ): Promise<{
    overallRiskScore: number;
    riskLevel: RiskLevel;
    riskFactors: Array<{
      factor: string;
      impact: number;
      description: string;
      mitigation: string;
    }>;
    connectionRisks: Array<{
      connectionPoint: string;
      riskScore: number;
      successProbability: number;
      warnings: string[];
    }>;
    weatherRisk: {
      currentRisk: number;
      forecast: any;
      impactAssessment: string;
    };
    recommendations: string[];
    alternativeRoutes: number;
  }> {
    try {
      // Get connections for route
      const connections = await this.multimodalConnectionRepository
        .findByRouteAndTransport(origin, destination, transportTypes);

      // Analyze each connection
      const connectionRisks = await Promise.all(
        connections.map(async (connection: MultimodalConnection) => {
          const riskScore = connection.calculateRiskScore(departureTime);
          const successProbability = connection.getSuccessProbability(
            connection.recommendedConnectionTimeMinutes
          );

          const warnings = [];
          if (riskScore > 0.7) warnings.push('High risk connection point');
          if (connection.delayProbability > 0.3) warnings.push('Frequent delays reported');
          if (!connection.hasWaitingFacilities) warnings.push('No waiting facilities available');

          return {
            connectionPoint: connection.connectionPoint.name,
            riskScore,
            successProbability,
            warnings
          };
        })
      );

      // Get weather risk
      const weatherData = await this.weatherService.getForecast(origin, destination, departureTime);
      const weatherRisk = await this.calculateWeatherRisk(weatherData);

      // Calculate overall risk
      const overallRiskScore = this.calculateOverallRiskScore(connectionRisks, weatherRisk);

      return {
        overallRiskScore,
        riskLevel: this.mapRiskScoreToLevel(overallRiskScore),
        riskFactors: await this.extractRiskFactors(connections, departureTime),
        connectionRisks,
        weatherRisk,
        recommendations: this.generateRiskRecommendations(overallRiskScore, connectionRisks),
        alternativeRoutes: connections.length
      };
    } catch (error) {
      console.error('Risk analysis error:', error);
      throw new Error(`Risk analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods
  private validateSearchRequest(request: SearchRequest): void {
    if (!request.origin?.trim()) {
      throw new Error('Origin is required');
    }
    if (!request.destination?.trim()) {
      throw new Error('Destination is required');
    }
    if (request.origin === request.destination) {
      throw new Error('Origin and destination must be different');
    }
    if (request.passengers?.adults < 0 || request.passengers?.children < 0 || request.passengers?.infants < 0) {
      throw new Error('Passenger counts cannot be negative');
    }
    const totalPassengers = (request.passengers?.adults || 0) +
                           (request.passengers?.children || 0) +
                           (request.passengers?.infants || 0);
    if (totalPassengers > 50) {
      throw new Error('Maximum 50 passengers allowed');
    }
  }

  private async findRelevantTemplates(request: SearchRequest): Promise<RouteTemplate[]> {
    const templates = await this.routeTemplateRepository.search({
      originPoint: request.origin,
      destinationPoint: request.destination,
      transportTypes: request.transportPreferences,
      isActive: true,
      limit: 20
    });

    // Filter by passenger capacity and requirements
    return templates.filter(template =>
      template.isPassengerCountValid(this.getTotalPassengers(request.passengers)) &&
      (!request.accessibilityRequired || template.accessibilitySupport) &&
      (!request.vipRequired || template.isSuitableForVip())
    );
  }

  private async findAvailableConnections(request: SearchRequest): Promise<MultimodalConnection[]> {
    // Find connections that match the route requirements
    const connections = await this.multimodalConnectionRepository.findByRoute(
      request.origin,
      request.destination
    );

    // Filter by availability and risk tolerance
    const departureDate = request.departureDate || new Date();

    return connections.filter(connection => {
      // Check if connection is available at departure time
      if (!connection.isAvailableAt(departureDate)) {
        return false;
      }

      // Filter by risk tolerance
      const riskScore = connection.calculateRiskScore(departureDate);
      const riskToleranceMap = {
        low: 0.3,
        medium: 0.6,
        high: 0.8
      };

      return riskScore <= riskToleranceMap[request.riskTolerance || 'medium'];
    });
  }

  private async buildRouteOptions(
    templates: RouteTemplate[],
    connections: MultimodalConnection[],
    request: SearchRequest
  ): Promise<RouteOption[]> {
    const options: RouteOption[] = [];
    const totalPassengers = this.getTotalPassengers(request.passengers);

    // Build options from templates
    for (const template of templates) {
      try {
        const option = await this.buildOptionFromTemplate(template, request, totalPassengers);
        if (option) {
          options.push(option);
        }
      } catch (error) {
        console.error('Error building option from template:', error);
        continue;
      }
    }

    // Build custom options using connections
    for (const connection of connections) {
      try {
        const customOptions = await this.buildCustomOptions(connection, request, totalPassengers);
        options.push(...customOptions);
      } catch (error) {
        console.error('Error building custom option:', error);
        continue;
      }
    }

    return options;
  }

  private async buildOptionFromTemplate(
    template: RouteTemplate,
    request: SearchRequest,
    totalPassengers: number
  ): Promise<RouteOption | null> {
    const departureDate = request.departureDate || new Date();

    // Calculate pricing
    const basePrice = template.calculatePrice(
      totalPassengers,
      departureDate,
      this.isWeekend(departureDate),
      this.isLastMinute(departureDate),
      true // Corporate discount
    );

    // Build segments
    const segments = template.routeSegments.map((segment, index) => ({
      id: `${template.id}_segment_${index}`,
      type: segment.type,
      from: segment.from,
      to: segment.to,
      departureTime: this.calculateSegmentDepartureTime(departureDate, index, template.routeSegments),
      arrivalTime: this.calculateSegmentArrivalTime(departureDate, index, template.routeSegments),
      durationMinutes: segment.estimatedTime,
      distanceKm: segment.distance || 0,
      price: (segment.price || basePrice / template.routeSegments.length) * totalPassengers,
      currency: template.priceCurrency,
      provider: segment.provider || 'Various',
      capacity: segment.capacity || 50,
      availableSeats: Math.max(0, (segment.capacity || 50) - totalPassengers),
      amenities: [],
      riskLevel: segment.riskLevel || template.riskLevel,
      weatherSensitivity: template.riskFactors.weatherDependency,
      accessible: template.accessibilitySupport,
      vipAvailable: true,
      discountEligible: true,
      realTimeTracking: false
    }));

    // Calculate risk score
    const riskScore = template.calculateRiskScore();

    return {
      id: template.id,
      name: template.templateName,
      description: template.templateDescription || '',
      totalDurationMinutes: template.estimatedDurationMinutes,
      totalPrice: basePrice,
      currency: template.priceCurrency,
      riskLevel: template.riskLevel,
      riskScore,
      segments,
      connections: this.buildConnectionInfo(template.transferPoints),
      transportTypes: template.transportTypes,
      departureTime: departureDate,
      arrivalTime: template.getEstimatedArrivalTime(departureDate),
      passengerCapacity: template.maxPassengers,
      accessibilitySupport: template.accessibilitySupport,
      vipAvailable: true,
      discountAvailable: template.corporateDiscountAvailable,
      bookingConfidence: 0.9, // High confidence for verified templates
      carbonFootprintKg: this.calculateCarbonFootprint(segments),
      weatherDependency: template.riskFactors.weatherDependency,
      seasonalRestrictions: template.isSeasonal ? this.getSeasonalRestrictions(template) : undefined
    };
  }

  private async buildCustomOptions(
    connection: MultimodalConnection,
    request: SearchRequest,
    totalPassengers: number
  ): Promise<RouteOption[]> {
    // This would build custom route options using available connections
    // For now, returning empty array as placeholder
    return [];
  }

  private async rankRouteOptions(options: RouteOption[], request: SearchRequest): Promise<RouteOption[]> {
    // Sort based on user preferences
    return options.sort((a, b) => {
      switch (request.timePreference) {
        case 'fastest':
          return a.totalDurationMinutes - b.totalDurationMinutes;
        case 'cheapest':
          return a.totalPrice - b.totalPrice;
        case 'balanced':
        default:
          // Balanced scoring
          const scoreA = this.calculateBalancedScore(a, request);
          const scoreB = this.calculateBalancedScore(b, request);
          return scoreB - scoreA;
      }
    });
  }

  private calculateBalancedScore(option: RouteOption, request: SearchRequest): number {
    let score = 100;

    // Time factor (lower is better)
    score -= (option.totalDurationMinutes / 60) * 2;

    // Price factor (lower is better)
    score -= (option.totalPrice / 1000);

    // Risk factor (lower is better)
    score -= option.riskScore * 20;

    // Bonus for good booking confidence
    score += option.bookingConfidence * 10;

    return Math.max(0, score);
  }

  private async addAlternatives(options: RouteOption[], request: SearchRequest): Promise<RouteOption[]> {
    // For each top option, add alternatives
    const optionsWithAlternatives = options.slice(0, 10); // Top 10 options

    for (const option of optionsWithAlternatives) {
      option.alternativeOptions = await this.generateAlternatives(option, request);
    }

    return optionsWithAlternatives;
  }

  private async generateAlternatives(option: RouteOption, request: SearchRequest): Promise<AlternativeRouteOption[]> {
    const alternatives: AlternativeRouteOption[] = [];

    // Cheaper alternative (remove VIP, use lower comfort)
    if (option.vipAvailable) {
      alternatives.push({
        id: `${option.id}_economy`,
        name: 'Economy Option',
        priceDifference: -option.totalPrice * 0.15,
        priceDifferencePercent: -15,
        timeDifference: 10, // 10 minutes longer
        riskDifference: 0.1,
        description: 'Standard comfort without VIP services',
        reason: 'Save money with basic services'
      });
    }

    // Faster alternative (more connections)
    if (option.segments.length > 1) {
      alternatives.push({
        id: `${option.id}_express`,
        name: 'Express Route',
        priceDifference: option.totalPrice * 0.25,
        priceDifferencePercent: 25,
        timeDifference: -30, // 30 minutes faster
        riskDifference: 0.05,
        description: 'Faster route with premium connections',
        reason: 'Save time with express connections'
      });
    }

    return alternatives;
  }

  // Helper methods
  private generateSearchId(): string {
    return `SEARCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTotalPassengers(passengers: any): number {
    return (passengers?.adults || 0) + (passengers?.children || 0) + (passengers?.infants || 0);
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private isLastMinute(date: Date): boolean {
    const hoursUntilDeparture = (date.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilDeparture < 24;
  }

  private calculateSegmentDepartureTime(
    departureDate: Date,
    segmentIndex: number,
    segments: any[]
  ): Date {
    if (segmentIndex === 0) {
      return departureDate;
    }

    const departureTime = new Date(departureDate);
    let accumulatedTime = 0;

    for (let i = 0; i < segmentIndex; i++) {
      accumulatedTime += segments[i].estimatedTime;
      accumulatedTime += 60; // 1 hour connection buffer
    }

    departureTime.setMinutes(departureTime.getMinutes() + accumulatedTime);
    return departureTime;
  }

  private calculateSegmentArrivalTime(
    departureDate: Date,
    segmentIndex: number,
    segments: any[]
  ): Date {
    const departureTime = this.calculateSegmentDepartureTime(departureDate, segmentIndex, segments);
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + segments[segmentIndex].estimatedTime);
    return arrivalTime;
  }

  private buildConnectionInfo(transferPoints: any[]): ConnectionInfo[] {
    return transferPoints.map((point, index) => ({
      id: `connection_${index}`,
      location: point.name,
      arrivalTime: new Date(), // Would calculate based on segments
      nextDepartureTime: new Date(),
      connectionTimeMinutes: point.waitTimeMinutes || 60,
      bufferTimeMinutes: point.bufferTimeMinutes || 30,
      riskLevel: point.riskLevel || RiskLevel.MEDIUM,
      riskScore: 0.3,
      successProbability: 0.9,
      hasWaitingFacilities: true,
      accessibilitySupport: true,
      weatherRisk: 0.2
    }));
  }

  private calculateCarbonFootprint(segments: RouteSegment[]): number {
    // Simple carbon footprint calculation
    return segments.reduce((total, segment) => {
      const emissionFactors = {
        [TransportType.FLIGHT]: 0.25, // kg CO2 per km
        [TransportType.BUS]: 0.05,
        [TransportType.TAXI]: 0.15,
        [TransportType.HELICOPTER]: 0.5,
        [TransportType.RIVER]: 0.08,
        [TransportType.TRAIN]: 0.04,
        [TransportType.ALL_TERRAIN]: 0.12
      };

      return total + (segment.distanceKm * (emissionFactors[segment.type] || 0.1));
    }, 0);
  }

  private getSeasonalRestrictions(template: RouteTemplate): string[] {
    const restrictions: string[] = [];

    if (!template.seasonMonths.length || template.seasonMonths.length === 12) {
      return restrictions;
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];

    const availableMonths = template.seasonMonths.map(month => monthNames[month - 1]);
    const unavailableMonths = monthNames.filter((_, index) =>
      !template.seasonMonths.includes(index + 1)
    );

    restrictions.push(`Available only in: ${availableMonths.join(', ')}`);
    if (unavailableMonths.length > 0) {
      restrictions.push(`Unavailable in: ${unavailableMonths.join(', ')}`);
    }

    return restrictions;
  }

  private extractRiskConsiderations(options: RouteOption[]): string[] {
    const considerations: Set<string> = new Set();

    options.forEach(option => {
      if (option.riskScore > 0.7) {
        considerations.add('High-risk routes detected - consider alternatives');
      }
      if (option.weatherDependency > 0.5) {
        considerations.add('Weather-dependent routes - check forecasts');
      }
      if (option.connections.some(conn => conn.successProbability < 0.8)) {
        considerations.add('Some connections have low success probability');
      }
    });

    return Array.from(considerations);
  }

  private generateRecommendations(request: SearchRequest, options: RouteOption[]): string[] {
    const recommendations: string[] = [];

    if (options.length === 0) {
      recommendations.push('Consider adjusting travel dates or transport preferences');
      recommendations.push('Try searching with higher risk tolerance');
    }

    if (request.passengers?.children > 0 || request.passengers?.infants > 0) {
      recommendations.push('Consider routes with shorter connection times when traveling with children');
    }

    if (request.vipRequired) {
      recommendations.push('VIP routes may have limited availability - book in advance');
    }

    if (request.accessibilityRequired) {
      recommendations.push('Confirm accessibility support is available for all segments');
    }

    return recommendations;
  }

  private generateFilters(options: RouteOption[]) {
    const transportTypes = new Set<TransportType>();
    const riskLevels = new Set<RiskLevel>();
    let minPrice = Infinity;
    let maxPrice = 0;
    let minDuration = Infinity;
    let maxDuration = 0;

    options.forEach(option => {
      option.transportTypes.forEach(type => transportTypes.add(type));
      riskLevels.add(option.riskLevel);

      minPrice = Math.min(minPrice, option.totalPrice);
      maxPrice = Math.max(maxPrice, option.totalPrice);
      minDuration = Math.min(minDuration, option.totalDurationMinutes);
      maxDuration = Math.max(maxDuration, option.totalDurationMinutes);
    });

    return {
      transportTypes: Array.from(transportTypes),
      priceRange: { min: minPrice, max: maxPrice },
      durationRange: { min: minDuration, max: maxDuration },
      riskLevels: Array.from(riskLevels)
    };
  }

  private filterConnectionsByPreferences(
    connections: MultimodalConnection[],
    request: SmartConnectionRequest
  ): MultimodalConnection[] {
    return connections.filter(connection => {
      // Filter by transport types
      const hasMatchingTransport = request.transportTypes.includes(connection.fromSegmentType) ||
                                   request.transportTypes.includes(connection.toSegmentType);

      if (!hasMatchingTransport) {
        return false;
      }

      // Filter by risk tolerance
      const riskScore = connection.calculateRiskScore(request.plannedDepartureTime);
      const riskToleranceMap = {
        low: 0.3,
        medium: 0.6,
        high: 0.8
      };

      return riskScore <= riskToleranceMap[request.riskTolerance];
    });
  }

  private async generateConnectionPlans(
    connections: MultimodalConnection[],
    request: SmartConnectionRequest
  ): Promise<ConnectionPlan[]> {
    // This would generate optimal connection plans
    // For now, returning simple plans
    return connections.map(connection => ({
      id: `plan_${connection.id}`,
      segments: [], // Would build actual segments
      connections: [], // Would build connection info
      totalTimeMinutes: connection.recommendedConnectionTimeMinutes,
      totalPrice: 1000, // Would calculate actual price
      riskScore: connection.calculateRiskScore(request.plannedDepartureTime),
      successProbability: connection.getSuccessProbability(connection.recommendedConnectionTimeMinutes),
      requiresSpecialArrangements: connection.requiresSpecialArrangements(),
      lastUpdated: new Date()
    }));
  }

  private async analyzePlanRisks(
    plans: ConnectionPlan[],
    request: SmartConnectionRequest
  ): Promise<ConnectionPlan[]> {
    // Enhanced risk analysis for connection plans
    return plans.map(plan => ({
      ...plan,
      riskScore: Math.min(1.0, plan.riskScore * 1.1), // Add 10% buffer for connections
      requiresSpecialArrangements: plan.riskScore > 0.7 || plan.requiresSpecialArrangements
    }));
  }

  private async performRiskAssessment(
    plans: ConnectionPlan[],
    request: SmartConnectionRequest,
    weatherData: any
  ): Promise<any> {
    const overallRiskScore = plans.length > 0 ?
      plans.reduce((sum, plan) => sum + plan.riskScore, 0) / plans.length : 0;

    const riskFactors = [];
    const recommendations = [];
    const weatherWarnings = [];

    if (overallRiskScore > 0.7) {
      riskFactors.push('High overall route risk');
      recommendations.push('Consider alternative routes or travel dates');
    }

    if (weatherData?.risk > 0.5) {
      riskFactors.push('Adverse weather conditions');
      weatherWarnings.push('Check weather forecasts before departure');
      recommendations.push('Allow extra time for weather delays');
    }

    return {
      overallRiskScore,
      riskFactors,
      recommendations,
      weatherWarnings
    };
  }

  private async generateAlternativePlans(
    primaryPlans: ConnectionPlan[],
    request: SmartConnectionRequest
  ): Promise<ConnectionPlan[]> {
    // Generate alternative connection plans
    return primaryPlans.slice(0, 3).map(plan => ({
      ...plan,
      id: `alt_${plan.id}`,
      riskScore: Math.min(1.0, plan.riskScore + 0.1),
      totalPrice: plan.totalPrice * 1.2, // 20% more expensive
      totalTimeMinutes: plan.totalTimeMinutes + 30 // 30 minutes longer
    }));
  }

  private determineConnectionStatus(
    connection: MultimodalConnection,
    realTimeData: any,
    weatherData: any
  ): any {
    let status: 'operational' | 'delayed' | 'disrupted' | 'closed' = 'operational';
    let currentDelayMinutes = 0;

    // Check real-time data
    if (realTimeData?.delayMinutes > 0) {
      currentDelayMinutes = realTimeData.delayMinutes;
      status = realTimeData.delayMinutes > 60 ? 'disrupted' : 'delayed';
    }

    // Check weather impact
    if (weatherData?.risk > 0.7) {
      if (status === 'operational') {
        status = 'delayed';
      }
    }

    return {
      status,
      currentDelayMinutes,
      estimatedRecoveryTime: currentDelayMinutes > 0 ?
        new Date(Date.now() + currentDelayMinutes * 60 * 1000) : undefined,
      alternativeRouteAvailable: connection.alternativeConnections.length > 0,
      weatherImpact: weatherData?.risk || 0,
      recommendations: this.generateConnectionRecommendations(connection, currentDelayMinutes)
    };
  }

  private generateConnectionRecommendations(
    connection: MultimodalConnection,
    currentDelayMinutes: number
  ): string[] {
    const recommendations: string[] = [];

    if (currentDelayMinutes > 30) {
      recommendations.push('Consider alternative route');
    }

    if (connection.delayProbability > 0.3) {
      recommendations.push('Add buffer time for this connection');
    }

    if (!connection.hasWaitingFacilities) {
      recommendations.push('Bring supplies for potential delays');
    }

    return recommendations;
  }

  private calculateWeatherRisk(weatherData: any): any {
    // Placeholder for weather risk calculation
    return {
      currentRisk: weatherData?.risk || 0.1,
      forecast: weatherData,
      impactAssessment: 'Low weather impact expected'
    };
  }

  private calculateOverallRiskScore(
    connectionRisks: any[],
    weatherRisk: any
  ): number {
    const connectionRiskScore = connectionRisks.length > 0 ?
      connectionRisks.reduce((sum, risk) => sum + risk.riskScore, 0) / connectionRisks.length : 0;

    return Math.max(connectionRiskScore, weatherRisk.currentRisk || 0);
  }

  private mapRiskScoreToLevel(riskScore: number): RiskLevel {
    if (riskScore < 0.3) return RiskLevel.LOW;
    if (riskScore < 0.6) return RiskLevel.MEDIUM;
    if (riskScore < 0.8) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  private async extractRiskFactors(
    connections: MultimodalConnection[],
    departureTime: Date
  ): Promise<any[]> {
    const factors: any[] = [];

    connections.forEach(connection => {
      if (connection.riskFactors.weatherSensitivity > 0.5) {
        factors.push({
          factor: 'Weather Sensitivity',
          impact: connection.riskFactors.weatherSensitivity,
          description: 'Route is highly dependent on weather conditions',
          mitigation: 'Monitor weather forecasts and have backup plans'
        });
      }

      if (connection.riskFactors.trafficDependency) {
        factors.push({
          factor: 'Traffic Dependency',
          impact: 0.4,
          description: 'Route affected by traffic conditions',
          mitigation: 'Allow extra time during peak hours'
        });
      }

      if (connection.riskFactors.infrastructureQuality === 'low') {
        factors.push({
          factor: 'Infrastructure Quality',
          impact: 0.6,
          description: 'Poor infrastructure at connection point',
          mitigation: 'Consider alternative routes or transport modes'
        });
      }
    });

    return factors;
  }

  private generateRiskRecommendations(
    overallRiskScore: number,
    connectionRisks: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (overallRiskScore > 0.7) {
      recommendations.push('Consider alternative routes with lower risk');
    }

    if (connectionRisks.some(risk => risk.successProbability < 0.8)) {
      recommendations.push('Allow extra buffer time for connections');
    }

    if (connectionRisks.some(risk => risk.warnings.length > 0)) {
      recommendations.push('Review all warnings and prepare contingencies');
    }

    recommendations.push('Monitor real-time updates before departure');
    recommendations.push('Have alternative transport options ready');

    return recommendations;
  }
}