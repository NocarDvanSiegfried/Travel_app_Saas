/**
 * Фабрика для создания OData клиента с конфигурацией из переменных окружения
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ODataClient } from './odata-client';
import { IODataClientConfig } from './types';
import { ICacheService } from '../../cache/ICacheService';
import { RedisCacheService } from '../../cache/RedisCacheService';

// Load .env from project root (for Docker) or from backend directory (for local)
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
const localEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config({ path: localEnvPath });
}

/**
 * Создать OData клиент с конфигурацией из переменных окружения
 */
export function createODataClient(cache?: ICacheService): ODataClient | null {
  let baseUrl = (process.env.ODATA_BASE_URL || '').trim();
  
  // Очистка baseUrl от пробелов и проверка формата
  if (baseUrl) {
    baseUrl = baseUrl.replace(/\s+/g, '');
    // Проверка, что URL начинается с http:// или https://
    if (!baseUrl.match(/^https?:\/\//i)) {
      return null;
    }
    // Удаление завершающего слеша
    baseUrl = baseUrl.replace(/\/+$/, '');
  }

  const config: IODataClientConfig = {
    baseUrl,
    username: process.env.ODATA_USERNAME?.trim(),
    password: process.env.ODATA_PASSWORD?.trim(),
    timeout: parseInt(process.env.ODATA_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.ODATA_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.ODATA_RETRY_DELAY || '1000', 10),
    enableCache: process.env.ODATA_ENABLE_CACHE !== 'false',
    cacheTTL: parseInt(process.env.ODATA_CACHE_TTL || '3600', 10),
    enableMetadata: process.env.ODATA_ENABLE_METADATA !== 'false',
    validateFields: process.env.ODATA_VALIDATE_FIELDS !== 'false',
  };

  // Если baseUrl не указан или некорректен, возвращаем null для использования fallback
  if (!config.baseUrl) {
    return null;
  }

  try {
    const cacheService = cache || (config.enableCache ? new RedisCacheService() : undefined);
    return new ODataClient(config, cacheService);
  } catch (error) {
    return null;
  }
}

/**
 * Создать OData клиент без кеша
 */
export function createODataClientWithoutCache(): ODataClient {
  const config: IODataClientConfig = {
    baseUrl: process.env.ODATA_BASE_URL || '',
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD,
    timeout: parseInt(process.env.ODATA_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.ODATA_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.ODATA_RETRY_DELAY || '1000', 10),
    enableCache: false,
  };

  if (!config.baseUrl) {
    throw new Error('ODATA_BASE_URL environment variable is required');
  }

  return new ODataClient(config);
}

