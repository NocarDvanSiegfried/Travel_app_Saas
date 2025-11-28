/**
 * Entities для умной мультимодальной системы маршрутизации
 */

export {
  AdministrativeStructure,
  createAdministrativeStructure,
} from './AdministrativeStructure';
export { City, ICity } from './City';
export { Hub, IHub } from './Hub';
export { Stop, IStop, StopType } from './Stop';
export {
  SmartRoute,
  ISmartRoute,
  ValidationResult,
  formatTotalDuration,
} from './SmartRoute';
export {
  SmartRouteSegment,
  ISmartRouteSegment,
  SegmentMetadata,
  formatDuration,
} from './SmartRouteSegment';





