/**
 * Swagger/OpenAPI Configuration
 * 
 * Configures Swagger UI for API documentation.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Travel App API',
    version: process.env.API_VERSION || '1.0.0',
    description: 'API для поиска и построения маршрутов между городами',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:5000/api/v1',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'Cities',
      description: 'City management endpoints',
    },
    {
      name: 'Routes',
      description: 'Route search and building endpoints',
    },
    {
      name: 'Risk',
      description: 'Route risk assessment endpoints',
    },
    {
      name: 'Diagnostics',
      description: 'System diagnostics endpoints',
    },
    {
      name: 'Metrics',
      description: 'Prometheus metrics endpoint',
    },
  ],
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                description: 'Error message',
                example: 'Invalid input parameters',
              },
            },
            required: ['code', 'message'],
          },
        },
        required: ['error'],
      },
      PaginationQuery: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number (1-indexed)',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
            description: 'Number of items per page',
          },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          pagination: {
            type: 'object',
            properties: {
              totalItems: {
                type: 'integer',
                description: 'Total number of items',
              },
              totalPages: {
                type: 'integer',
                description: 'Total number of pages',
              },
              currentPage: {
                type: 'integer',
                description: 'Current page number',
              },
              itemsPerPage: {
                type: 'integer',
                description: 'Number of items per page',
              },
              hasNextPage: {
                type: 'boolean',
                description: 'Whether there is a next page',
              },
              hasPreviousPage: {
                type: 'boolean',
                description: 'Whether there is a previous page',
              },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input parameters',
              },
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An internal error occurred',
              },
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
              },
            },
          },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/presentation/controllers/*.ts',
    './src/presentation/routes/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

