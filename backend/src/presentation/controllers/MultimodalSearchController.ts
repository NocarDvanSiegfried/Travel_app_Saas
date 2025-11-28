import { Request, Response } from 'express';
import { MultimodalSearchService } from '../../application/services/MultimodalSearchService';

export class MultimodalSearchController {
  constructor(private readonly multimodalSearchService: MultimodalSearchService) {}

  // Main search endpoint
  async searchRoutes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Build search request from query and body
      const searchRequest = {
        origin: req.query.origin as string || req.body.origin,
        destination: req.query.destination as string || req.body.destination,
        departureDate: req.query.departureDate ? new Date(req.query.departureDate as string) :
                        req.body.departureDate ? new Date(req.body.departureDate) : undefined,
        returnDate: req.query.returnDate ? new Date(req.query.returnDate as string) :
                    req.body.returnDate ? new Date(req.body.returnDate) : undefined,
        passengers: {
          adults: parseInt(req.query.adults as string) || req.body.passengers?.adults || 1,
          children: parseInt(req.query.children as string) || req.body.passengers?.children || 0,
          infants: parseInt(req.query.infants as string) || req.body.passengers?.infants || 0
        },
        transportPreferences: req.query.transportTypes ?
          (req.query.transportTypes as string).split(',') :
          req.body.transportPreferences,
        maxStops: req.query.maxStops ? parseInt(req.query.maxStops as string) : req.body.maxStops,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : req.body.maxPrice,
        currency: req.query.currency as string || req.body.currency || 'RUB',
        riskTolerance: req.query.riskTolerance as 'low' | 'medium' | 'high' ||
                      req.body.riskTolerance || 'medium',
        timePreference: req.query.timePreference as 'fastest' | 'cheapest' | 'balanced' ||
                        req.body.timePreference || 'balanced',
        accessibilityRequired: req.query.accessibilityRequired === 'true' ||
                               req.body.accessibilityRequired || false,
        vipRequired: req.query.vipRequired === 'true' ||
                    req.body.vipRequired || false,
        benefitsRequired: req.query.benefitsRequired === 'true' ||
                         req.body.benefitsRequired || false
      };

      const result = await this.multimodalSearchService.searchRoutes(searchRequest);

      res.json({
        success: true,
        data: result,
        meta: {
          searchId: result.searchMetadata.searchId,
          totalResults: result.totalResults,
          searchDurationMs: result.searchMetadata.searchDurationMs
        }
      });
    } catch (error) {
      console.error('Error searching routes:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Smart connection planning
  async planSmartConnection(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, plannedDepartureTime, transportTypes, riskTolerance, maxTotalTime, maxConnections, considerWeather, realTimeData } = req.body;

      if (!origin || !destination || !plannedDepartureTime || !transportTypes) {
        res.status(400).json({
          error: 'Missing required fields: origin, destination, plannedDepartureTime, transportTypes'
        });
        return;
      }

      const connectionRequest = {
        origin,
        destination,
        plannedDepartureTime: new Date(plannedDepartureTime),
        transportTypes,
        riskTolerance: riskTolerance || 'medium',
        maxTotalTime: maxTotalTime || 1440, // 24 hours default
        maxConnections: maxConnections || 3,
        considerWeather: considerWeather !== false,
        realTimeData: realTimeData !== false
      };

      const result = await this.multimodalSearchService.planSmartConnection(connectionRequest);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error planning smart connection:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get connection status
  async getConnectionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { connectionId } = req.params;

      if (!connectionId) {
        res.status(400).json({ error: 'Connection ID is required' });
        return;
      }

      const status = await this.multimodalSearchService.getConnectionStatus(connectionId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting connection status:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get route risk analysis
  async getRouteRiskAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, departureTime, transportTypes } = req.query;

      if (!origin || !destination || !departureTime || !transportTypes) {
        res.status(400).json({
          error: 'Missing required query parameters: origin, destination, departureTime, transportTypes'
        });
        return;
      }

      const transportTypesArray = (transportTypes as string).split(',');

      const analysis = await this.multimodalSearchService.getRouteRiskAnalysis(
        origin as string,
        destination as string,
        new Date(departureTime as string),
        transportTypesArray
      );

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error getting route risk analysis:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Quick search for auto-suggestions
  async quickSearch(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;

      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      // This would integrate with external APIs for auto-completion
      const suggestions = await this.getSearchSuggestions(query as string);

      res.json({
        success: true,
        data: {
          query: query,
          suggestions: suggestions
        }
      });
    } catch (error) {
      console.error('Error in quick search:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get popular routes
  async getPopularRoutes(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user?.companyId;
      const { limit = 10, region } = req.query;

      // This would get popular routes for the company
      const popularRoutes = await this.getPopularRoutesByCompany(
        companyId as string,
        parseInt(limit as string),
        region as string
      );

      res.json({
        success: true,
        data: {
          routes: popularRoutes,
          meta: {
            count: popularRoutes.length,
            region: region || 'all'
          }
        }
      });
    } catch (error) {
      console.error('Error getting popular routes:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Save search to history
  async saveSearchHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { searchQuery, resultsCount, selectedOption } = req.body;

      if (!searchQuery) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      // This would save the search to user history
      const savedSearch = await this.saveSearchToHistory(userId, companyId, {
        query: searchQuery,
        resultsCount,
        selectedOption,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        data: savedSearch
      });
    } catch (error) {
      console.error('Error saving search history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get search history
  async getSearchHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 20, offset = 0 } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const history = await this.getUserSearchHistory(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: {
          searches: history.searches,
          meta: {
            total: history.total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string)
          }
        }
      });
    } catch (error) {
      console.error('Error getting search history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get route recommendations
  async getRouteRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;

      if (!userId || !companyId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { category, season, passengerCount } = req.query;

      const recommendations = await this.getPersonalizedRecommendations(
        userId,
        companyId,
        {
          category: category as string,
          season: season as string,
          passengerCount: passengerCount ? parseInt(passengerCount as string) : undefined
        }
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Error getting route recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Compare routes
  async compareRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { routeIds } = req.body;

      if (!Array.isArray(routeIds) || routeIds.length < 2) {
        res.status(400).json({
          error: 'At least 2 route IDs are required for comparison'
        });
        return;
      }

      if (routeIds.length > 5) {
        res.status(400).json({
          error: 'Maximum 5 routes can be compared at once'
        });
        return;
      }

      const comparison = await this.compareMultipleRoutes(routeIds);

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error comparing routes:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Helper methods (these would typically call repositories or external services)
  private async getSearchSuggestions(query: string): Promise<any[]> {
    // Placeholder implementation
    // This would integrate with geocoding APIs and route databases
    const suggestions = [
      { type: 'city', name: 'Якутск', description: 'Столица Республики Саха (Якутия)' },
      { type: 'city', name: 'Мирный', description: 'Город в Мирнинском районе' },
      { type: 'city', name: 'Олёкминск', description: 'Город в Олёкминском районе' },
      { type: 'airport', name: 'Якутск (Туран)', description: 'Аэропорт Якутска' },
      { type: 'station', name: 'Якутск вокзал', description: 'Железнодорожный вокзал Якутска' }
    ];

    return suggestions.filter(suggestion =>
      suggestion.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  private async getPopularRoutesByCompany(
    companyId: string,
    limit: number,
    region?: string
  ): Promise<any[]> {
    // Placeholder implementation
    return [
      {
        id: 'route1',
        origin: 'Якутск',
        destination: 'Мирный',
        frequency: 45,
        avgPrice: 8500,
        duration: 120,
        transportTypes: ['flight', 'helicopter']
      },
      {
        id: 'route2',
        origin: 'Якутск',
        destination: 'Олёкминск',
        frequency: 30,
        avgPrice: 2500,
        duration: 240,
        transportTypes: ['bus', 'taxi']
      }
    ];
  }

  private async saveSearchToHistory(
    userId: string,
    companyId: string,
    searchData: any
  ): Promise<any> {
    // Placeholder implementation
    return {
      id: 'search_history_1',
      userId,
      companyId,
      ...searchData
    };
  }

  private async getUserSearchHistory(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ searches: any[]; total: number }> {
    // Placeholder implementation
    return {
      searches: [
        {
          id: 'search1',
          query: 'Якутск - Мирный',
          resultsCount: 12,
          timestamp: new Date(Date.now() - 86400000) // 1 day ago
        },
        {
          id: 'search2',
          query: 'Якутск - Олёкминск',
          resultsCount: 8,
          timestamp: new Date(Date.now() - 172800000) // 2 days ago
        }
      ],
      total: 2
    };
  }

  private async getPersonalizedRecommendations(
    userId: string,
    companyId: string,
    options: any
  ): Promise<any[]> {
    // Placeholder implementation
    return [
      {
        type: 'popular_route',
        title: 'Якутск - Мирный',
        description: 'Наиболее популярный маршрут для командировок',
        price: 8500,
        duration: 120,
        reason: 'Популярный в вашей компании'
      },
      {
        type: 'seasonal_route',
        title: 'Якутск - Удачный',
        description: 'Зимний маршрут с вертолетом',
        price: 12000,
        duration: 90,
        reason: 'Рекомендуется для зимнего периода'
      }
    ];
  }

  private async compareMultipleRoutes(routeIds: string[]): Promise<any> {
    // Placeholder implementation
    return {
      comparison: {
        criteria: ['price', 'duration', 'risk', 'comfort', 'availability'],
        routes: routeIds.map((id, index) => ({
          id,
          name: `Маршрут ${index + 1}`,
          scores: {
            price: Math.random() * 100,
            duration: Math.random() * 100,
            risk: Math.random() * 100,
            comfort: Math.random() * 100,
            availability: Math.random() * 100
          }
        })),
        recommendation: routeIds[0] // Best route
      }
    };
  }
}