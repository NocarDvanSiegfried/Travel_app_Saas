/**
 * Экспорт OData клиента и связанных модулей
 */

export { ODataClient } from './odata-client';
export type {
  IODataClientConfig,
  IODataQueryParams,
  IODataResponse,
  IODataRequestResult,
  IODataEntity,
  IODataRoute,
  IODataRouteStop,
  IODataStop,
  IODataSchedule,
  IODataFlight,
  IODataTariff,
  IODataFlightTariff,
  IODataSeatOccupancy,
  IRouteDataForML,
  IStopForML,
  IScheduleForML,
  IHistoricalDataForML,
} from './types';
export {
  ODataClientError,
  ODataTimeoutError,
  ODataAuthenticationError,
  ODataNotFoundError,
  ODataServerError,
  ODataRetryExhaustedError,
} from './errors';
export {
  isRetryableError,
  calculateRetryDelay,
  waitForRetry,
  DEFAULT_RETRY_STRATEGY,
} from './retry-strategy';
export type { IRetryStrategy } from './retry-strategy';
export * from './services';
export {
  createODataClient,
  createODataClientWithoutCache,
} from './odata-client-factory';
export * from './metadata';
export * from './fallback-data';

