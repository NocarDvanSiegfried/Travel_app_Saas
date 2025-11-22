/**
 * Swagger UI Setup
 * 
 * Configures Swagger UI middleware for Express.
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config';
import { getLogger } from '../../shared/logger/Logger';

const logger = getLogger('SwaggerSetup');

/**
 * Setup Swagger UI for Express app
 * 
 * @param app - Express application instance
 * @param basePath - Base path for API (default: /api/v1)
 */
export function setupSwagger(app: Express, basePath: string = '/api/v1'): void {
  const swaggerPath = '/api-docs';

  app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Travel App API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  logger.info('Swagger UI configured', {
    module: 'SwaggerSetup',
    path: swaggerPath,
    basePath,
  });
}

