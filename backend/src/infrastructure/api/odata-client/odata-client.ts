/**
 * Универсальный клиент для работы с OData API v2
 */

import { IODataClientConfig, IODataQueryParams, IODataResponse, IODataRequestResult } from './types';
import {
  ODataClientError,
  ODataTimeoutError,
  ODataAuthenticationError,
  ODataNotFoundError,
  ODataServerError,
  ODataRetryExhaustedError,
} from './errors';
import {
  isRetryableError,
  calculateRetryDelay,
  waitForRetry,
  DEFAULT_RETRY_STRATEGY,
} from './retry-strategy';
import { ICacheService } from '../../cache/ICacheService';
import { ODataMetadataService } from './metadata/ODataMetadataService';
import { ODataFieldValidator } from './metadata/ODataFieldValidator';

/**
 * Универсальный OData клиент
 */
export class ODataClient {
  private readonly config: Required<Omit<IODataClientConfig, 'username' | 'password'>> & {
    username?: string;
    password?: string;
  };
  private readonly cache?: ICacheService;
  private metadataService?: ODataMetadataService;
  private fieldValidator?: ODataFieldValidator;

  constructor(
    config: IODataClientConfig,
    cache?: ICacheService
  ) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCache: true,
      cacheTTL: 3600,
      enableMetadata: true,
      validateFields: true,
      ...config,
    };
    this.cache = cache;
    
    if (config.enableMetadata !== false) {
      this.metadataService = new ODataMetadataService(this, cache);
      this.fieldValidator = new ODataFieldValidator(this.metadataService);
    }
  }

  /**
   * Выполнить GET запрос к OData API
   */
  async get<T>(
    entitySet: string,
    params?: IODataQueryParams,
    useCache: boolean = true
  ): Promise<IODataRequestResult<T>> {
    if (this.fieldValidator && this.config.validateFields !== false && params) {
      const validation = await this.fieldValidator.validateQueryParams(
        entitySet,
        params
      );
      if (!validation.valid) {
        throw new Error(
          `Query validation failed: ${validation.errors.join(', ')}`
        );
      }
    }

    const cacheKey = this.buildCacheKey(entitySet, params);
    
    if (useCache && this.cache && this.config.enableCache) {
      const cached = await this.cache.get<IODataRequestResult<T>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const url = this.buildUrl(entitySet, params);
    const result = await this.executeRequest<T>(url);

    if (useCache && this.cache && this.config.enableCache) {
      await this.cache.set(cacheKey, result, this.config.cacheTTL);
    }

    return result;
  }

  /**
   * Выполнить запрос с повторными попытками
   */
  private async executeRequest<T>(
    url: string,
    attempt: number = 1
  ): Promise<IODataRequestResult<T>> {
    try {
      const response = await this.makeRequest(url);
      return this.parseResponse<T>(response);
    } catch (error) {
      if (
        attempt < this.config.retryAttempts &&
        isRetryableError(error)
      ) {
        const delay = calculateRetryDelay(attempt);
        await waitForRetry(delay);
        return this.executeRequest<T>(url, attempt + 1);
      }
      
      if (error instanceof ODataClientError) {
        throw error;
      }
      
      throw new ODataRetryExhaustedError(
        `Failed after ${attempt} attempts`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Выполнить HTTP запрос (публичный для использования в MetadataService)
   */
  async makeRequest(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // Content-Type только для POST/PUT/PATCH запросов
      // Для GET запросов (включая метаданные) не нужен
      if (this.config.username && this.config.password) {
        const credentials = Buffer.from(
          `${this.config.username}:${this.config.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ODataTimeoutError(
            `Request timeout after ${this.config.timeout}ms`
          );
        }
        if (error.message.includes('fetch')) {
          throw new ODataClientError(
            `Network error: ${error.message}`,
            undefined,
            error
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Парсинг ответа OData API
   */
  private async parseResponse<T>(
    response: Response
  ): Promise<IODataRequestResult<T>> {
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    let jsonData: unknown;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim().length === 0) {
        throw new ODataClientError('Empty response from OData API', response.status);
      }
      jsonData = JSON.parse(responseText);
    } catch (parseError) {
      if (parseError instanceof ODataClientError) {
        throw parseError;
      }
      throw new ODataClientError(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        response.status
      );
    }

    const data = jsonData as IODataResponse<T>;

    if (data.error) {
      throw new ODataServerError(
        data.error.message?.value || 'OData server error',
        response.status,
        data.error
      );
    }

    const results = data.d?.results || data.value || [];
    const countValue = data['@odata.count'] ?? results.length;
    const count = typeof countValue === 'number' 
      ? countValue 
      : (typeof countValue === 'string' ? parseInt(countValue, 10) : results.length);

    return {
      data: Array.isArray(results) ? results as T[] : [],
      count: typeof count === 'number' ? count : results.length,
      hasMore: false,
    };
  }

  /**
   * Обработка ошибок ответа
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = `HTTP ${status}`;

    try {
      const errorData = await response.json() as unknown;
      if (
        errorData &&
        typeof errorData === 'object' &&
        'error' in errorData &&
        errorData.error &&
        typeof errorData.error === 'object' &&
        'message' in errorData.error &&
        errorData.error.message &&
        typeof errorData.error.message === 'object' &&
        'value' in errorData.error.message &&
        typeof errorData.error.message.value === 'string'
      ) {
        errorMessage = errorData.error.message.value;
      }
    } catch {
      errorMessage = await response.text().catch(() => `HTTP ${status}`);
    }

    switch (status) {
      case 401:
      case 403:
        throw new ODataAuthenticationError(errorMessage);
      case 404:
        throw new ODataNotFoundError(errorMessage);
      case 408:
      case 504:
        throw new ODataTimeoutError(errorMessage);
      default:
        if (status >= 500) {
          throw new ODataServerError(errorMessage, status);
        }
        throw new ODataClientError(errorMessage, status);
    }
  }

  /**
   * Построить URL для запроса
   */
  private buildUrl(
    entitySet: string,
    params?: IODataQueryParams
  ): string {
    // Очистка baseUrl от пробелов и завершающих слешей
    let baseUrl = this.config.baseUrl.trim().replace(/\s+/g, '');
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // Проверка формата URL
    if (!baseUrl.match(/^https?:\/\//i)) {
      throw new Error(`Invalid baseUrl format: ${baseUrl}. Must start with http:// or https://`);
    }

    // Очистка entitySet от пробелов
    const cleanEntitySet = entitySet.trim();
    const entityPath = cleanEntitySet.startsWith('/') ? cleanEntitySet : `/${cleanEntitySet}`;
    
    // Формирование URL без лишних пробелов
    let url = `${baseUrl}${entityPath}`;

    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key.trim(), String(value).trim());
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Построить ключ кеша
   */
  private buildCacheKey(
    entitySet: string,
    params?: IODataQueryParams
  ): string {
    const paramsStr = params
      ? JSON.stringify(params)
      : '';
    return `odata:${entitySet}:${Buffer.from(paramsStr).toString('base64')}`;
  }

  /**
   * Инвалидировать кеш для сущности
   */
  async invalidateCache(entitySet: string): Promise<void> {
    if (this.cache) {
      const pattern = `odata:${entitySet}:*`;
      await this.cache.deleteByPattern(pattern);
    }
  }

  /**
   * Очистить весь кеш OData
   */
  async clearCache(): Promise<void> {
    if (this.cache) {
      await this.cache.deleteByPattern('odata:*');
    }
  }

  /**
   * Загрузить метаданные
   */
  async loadMetadata(forceReload: boolean = false): Promise<void> {
    if (this.metadataService) {
      await this.metadataService.loadMetadata(forceReload);
    }
  }

  /**
   * Получить сервис метаданных
   */
  getMetadataService(): ODataMetadataService | undefined {
    return this.metadataService;
  }

  /**
   * Получить валидатор полей
   */
  getFieldValidator(): ODataFieldValidator | undefined {
    return this.fieldValidator;
  }

  /**
   * Получить baseUrl (для использования в MetadataService)
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }
}

