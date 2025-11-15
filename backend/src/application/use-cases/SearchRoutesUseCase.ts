import { Route } from '@domain/entities/Route';
import { RoutePreferenceType } from '@domain/value-objects/RoutePreference';
import { MockRouteService } from '../services/MockRouteService';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для поиска мультимодальных маршрутов
 */
export class SearchRoutesUseCase {
  constructor(private readonly mockRouteService: MockRouteService) {}

  async execute(
    from: string,
    to: string,
    date: Date,
    preference?: RoutePreferenceType
  ): Promise<Route[]> {
    try {
      logger.info('Searching routes', { from, to, date: date.toISOString(), preference });

      const routes = this.mockRouteService.filterRoutes(from, to, date, preference);

      logger.info('Routes found', { count: routes.length });

      return routes;
    } catch (error) {
      logger.error('Error searching routes', error);
      throw error;
    }
  }
}

