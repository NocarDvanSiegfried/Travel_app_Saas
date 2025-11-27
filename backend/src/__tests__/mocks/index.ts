/**
 * Test Mocks
 * 
 * Централизованный экспорт всех моков.
 * Стабильные, повторяемые, изолированные от продакшена.
 */

// Database mocks
export * from './database.mock';

// Redis mocks
export * from './redis.mock';
export * from './redis-connection.mock';

// OSRM mocks
export * from './osrm-client.mock';
export * from './osrm-environment.mock';

// Cache service mock
export * from './cache-service.mock';
