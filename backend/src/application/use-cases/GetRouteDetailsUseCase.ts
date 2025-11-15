import { Route } from '@domain/entities/Route';
import { NotFoundError } from '@shared/errors';
import { MockRouteService } from '../services/MockRouteService';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для получения деталей маршрута
 */
export class GetRouteDetailsUseCase {
  constructor(private readonly mockRouteService: MockRouteService) {}

  async execute(routeId: string): Promise<Route> {
    try {
      logger.info('Getting route details', { routeId });

      const route = this.mockRouteService.getRouteById(routeId);

      if (!route) {
        throw new NotFoundError('Route', routeId);
      }

      logger.info('Route details retrieved', { routeId });

      return route;
    } catch (error) {
      logger.error('Error getting route details', error);
      throw error;
    }
  }
}

