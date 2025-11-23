/**
 * Stop Validator
 * 
 * Validates stop data before saving to database.
 * Ensures data quality and prevents garbage cities from being saved.
 * 
 * @module shared/validators
 */

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * List of service words that should not be used as city names
 */
const SERVICE_WORDS = new Set([
  'центральная',
  'главный',
  'пассажирский',
  'международный',
  'внутренний',
  'туймаада',
  'туймада',
  'аэропорт',
  'вокзал',
  'автостанция',
  'станция',
  'остановка'
]);

/**
 * Validate stop data before saving
 * 
 * @param stopData - Stop data to validate
 * @returns Validation result with isValid flag and list of errors
 * 
 * @example
 * validateStopData({ name: "Аэропорт Якутск", latitude: 62.0, longitude: 129.7, cityId: "якутск" })
 * => { isValid: true, errors: [] }
 * 
 * validateStopData({ name: "", latitude: NaN, longitude: 200, cityId: "центральная" })
 * => { isValid: false, errors: ["name is empty", "latitude is invalid", "longitude is out of range", "cityId is a service word"] }
 */
export function validateStopData(stopData: any): ValidationResult {
  const errors: string[] = [];

  if (!stopData) {
    return {
      isValid: false,
      errors: ['stopData is required']
    };
  }

  const name = stopData.name;
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    errors.push('name must be a non-empty string with at least 3 characters');
  }

  const latitude = stopData.latitude ?? stopData.coordinates?.latitude;
  if (typeof latitude !== 'number' || isNaN(latitude) || !isFinite(latitude)) {
    errors.push('latitude must be a valid number');
  } else if (latitude < -90 || latitude > 90) {
    errors.push('latitude must be in range [-90, 90]');
  }

  const longitude = stopData.longitude ?? stopData.coordinates?.longitude;
  if (typeof longitude !== 'number' || isNaN(longitude) || !isFinite(longitude)) {
    errors.push('longitude must be a valid number');
  } else if (longitude < -180 || longitude > 180) {
    errors.push('longitude must be in range [-180, 180]');
  }

  const cityId = stopData.cityId ?? stopData.cityName;
  if (cityId) {
    const normalizedCityId = String(cityId).toLowerCase().trim();
    if (SERVICE_WORDS.has(normalizedCityId)) {
      errors.push(`cityId "${cityId}" is a service word and cannot be used as a city name`);
    }
  } else {
    errors.push('cityId is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}



