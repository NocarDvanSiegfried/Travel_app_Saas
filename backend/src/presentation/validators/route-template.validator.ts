import { body, param, validationResult } from 'express-validator';

// Custom validators
const isUUID = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const isValidCoordinates = (value: any) => {
  if (!value || typeof value !== 'object') return true; // Optional
  return typeof value.lat === 'number' && value.lat >= -90 && value.lat <= 90 &&
         typeof value.lng === 'number' && value.lng >= -180 && value.lng <= 180;
};

const isValidTimeFormat = (value: string) => {
  if (!value) return true;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(value);
};

const isValidTransportType = (value: string) => {
  const validTypes = ['flight', 'bus', 'taxi', 'helicopter', 'river', 'train', 'all_terrain'];
  return validTypes.includes(value);
};

const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : 'unknown'
      }))
    });
  }
  next();
};

// Create template validation
export const createTemplate = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .custom(isUUID)
    .withMessage('Invalid company ID format'),

  body('templateName')
    .trim()
    .notEmpty()
    .withMessage('Template name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Template name must be between 3 and 255 characters'),

  body('templateDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Template description must be 1000 characters or less'),

  body('templateType')
    .isIn(['single', 'multimodal', 'round_trip'])
    .withMessage('Template type must be single, multimodal, or round_trip'),

  body('originPoint.name')
    .notEmpty()
    .withMessage('Origin point name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Origin point name must be between 2 and 255 characters'),

  body('originPoint.coordinates')
    .optional()
    .custom(isValidCoordinates)
    .withMessage('Invalid origin coordinates'),

  body('destinationPoint.name')
    .notEmpty()
    .withMessage('Destination point name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Destination point name must be between 2 and 255 characters'),

  body('destinationPoint.coordinates')
    .optional()
    .custom(isValidCoordinates)
    .withMessage('Invalid destination coordinates'),

  body('transportTypes')
    .isArray({ min: 1, max: 5 })
    .withMessage('Transport types must be an array with 1-5 items')
    .custom((array) => {
      for (const type of array) {
        if (!isValidTransportType(type)) {
          throw new Error(`Invalid transport type: ${type}`);
        }
      }
      return true;
    }),

  body('estimatedDurationMinutes')
    .isInt({ min: 5, max: 10080 }) // 5 minutes to 1 week
    .withMessage('Estimated duration must be between 5 and 10080 minutes'),

  body('estimatedDistanceKm')
    .isFloat({ min: 0.1, max: 50000 }) // 0.1km to 50000km
    .withMessage('Estimated distance must be between 0.1 and 50000 km'),

  body('hasTransfers')
    .optional()
    .isBoolean()
    .withMessage('Has transfers must be boolean'),

  body('transferPoints')
    .optional()
    .isArray()
    .withMessage('Transfer points must be an array'),

  body('transferPoints.*.name')
    .optional()
    .notEmpty()
    .withMessage('Transfer point name is required'),

  body('transferPoints.*.waitTimeMinutes')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('Wait time must be between 5 and 1440 minutes'),

  body('transferPoints.*.transferType')
    .optional()
    .notEmpty()
    .withMessage('Transfer type is required'),

  body('transferPoints.*.riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Risk level must be low, medium, high, or critical'),

  body('riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Risk level must be low, medium, high, or critical'),

  body('riskFactors.weatherDependency')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Weather dependency must be between 0 and 1'),

  body('riskFactors.seasonal')
    .optional()
    .isBoolean()
    .withMessage('Seasonal must be boolean'),

  body('riskFactors.roadQuality')
    .optional()
    .isIn(['excellent', 'good', 'medium', 'poor'])
    .withMessage('Road quality must be excellent, good, medium, or poor'),

  body('riskFactors.frequencyReliability')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Frequency reliability must be between 0 and 1'),

  body('riskFactors.infrastructureQuality')
    .optional()
    .isIn(['high', 'medium', 'low'])
    .withMessage('Infrastructure quality must be high, medium, or low'),

  body('riskFactors.trafficDependency')
    .optional()
    .isBoolean()
    .withMessage('Traffic dependency must be boolean'),

  body('maxPassengers')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max passengers must be between 1 and 1000'),

  body('minPassengers')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Min passengers must be between 1 and 1000'),

  body('accessibilitySupport')
    .optional()
    .isBoolean()
    .withMessage('Accessibility support must be boolean'),

  body('specialRequirements')
    .optional()
    .isArray()
    .withMessage('Special requirements must be an array'),

  body('isSeasonal')
    .optional()
    .isBoolean()
    .withMessage('Is seasonal must be boolean'),

  body('seasonMonths')
    .optional()
    .isArray()
    .withMessage('Season months must be an array')
    .custom((array) => {
      if (array.length === 0) return true;
      for (const month of array) {
        if (month < 1 || month > 12) {
          throw new Error('Month must be between 1 and 12');
        }
      }
      return true;
    }),

  body('operatingDays')
    .optional()
    .isArray()
    .withMessage('Operating days must be an array')
    .custom((array) => {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of array) {
        if (!validDays.includes(day)) {
          throw new Error(`Invalid operating day: ${day}`);
        }
      }
      return true;
    }),

  body('departureTimeConstraints.earliest')
    .optional()
    .custom(isValidTimeFormat)
    .withMessage('Earliest time must be in HH:MM format'),

  body('departureTimeConstraints.latest')
    .optional()
    .custom(isValidTimeFormat)
    .withMessage('Latest time must be in HH:MM format'),

  body('departureTimeConstraints.preferred')
    .optional()
    .isArray()
    .withMessage('Preferred times must be an array'),

  body('basePrice')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Base price must be between 0 and 1000000'),

  body('priceCurrency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters')
    .isAlpha()
    .withMessage('Currency must contain only letters'),

  body('priceVariations.weekendSurcharge')
    .optional()
    .isFloat({ min: 0.5, max: 3.0 })
    .withMessage('Weekend surcharge must be between 0.5 and 3.0'),

  body('priceVariations.seasonalSurcharge')
    .optional()
    .isFloat({ min: 0.5, max: 3.0 })
    .withMessage('Seasonal surcharge must be between 0.5 and 3.0'),

  body('priceVariations.lastMinuteSurcharge')
    .optional()
    .isFloat({ min: 0.5, max: 3.0 })
    .withMessage('Last minute surcharge must be between 0.5 and 3.0'),

  body('priceVariations.groupDiscount.minPassengers')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Group discount minimum passengers must be between 2 and 100'),

  body('priceVariations.groupDiscount.discountPercent')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Group discount percent must be between 0 and 50'),

  body('priceVariations.corporateDiscountPercent')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Corporate discount percent must be between 0 and 50'),

  body('corporateDiscountAvailable')
    .optional()
    .isBoolean()
    .withMessage('Corporate discount available must be boolean'),

  body('routeSegments')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Route segments must be an array with at least 1 item'),

  body('routeSegments.*.type')
    .optional()
    .custom(isValidTransportType)
    .withMessage('Invalid segment transport type'),

  body('routeSegments.*.from')
    .optional()
    .notEmpty()
    .withMessage('Segment from location is required'),

  body('routeSegments.*.to')
    .optional()
    .notEmpty()
    .withMessage('Segment to location is required'),

  body('routeSegments.*.distance')
    .optional()
    .isFloat({ min: 0.1, max: 10000 })
    .withMessage('Segment distance must be between 0.1 and 10000 km'),

  body('routeSegments.*.estimatedTime')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('Segment estimated time must be between 5 and 1440 minutes'),

  body('routeSegments.*.riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Segment risk level must be low, medium, high, or critical'),

  body('routeSegments.*.price')
    .optional()
    .isFloat({ min: 0, max: 100000 })
    .withMessage('Segment price must be between 0 and 100000'),

  body('routeSegments.*.capacity')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Segment capacity must be between 1 and 500'),

  body('isPublicTemplate')
    .optional()
    .isBoolean()
    .withMessage('Is public template must be boolean'),

  body('templateCategory')
    .optional()
    .isIn(['business', 'training', 'field_work', 'emergency', 'conference', 'team_building'])
    .withMessage('Template category must be one of the predefined categories'),

  body('multimodalSettings.autoBooking')
    .optional()
    .isBoolean()
    .withMessage('Auto booking must be boolean'),

  body('multimodalSettings.connectionBufferMinutes')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Connection buffer minutes must be between 15 and 480'),

  body('multimodalSettings.transferInsurance')
    .optional()
    .isBoolean()
    .withMessage('Transfer insurance must be boolean'),

  body('multimodalSettings.realTimeTracking')
    .optional()
    .isBoolean()
    .withMessage('Real-time tracking must be boolean'),

  body('multimodalSettings.alternativeTransportAllowed')
    .optional()
    .isBoolean()
    .withMessage('Alternative transport allowed must be boolean'),

  handleValidationErrors
];

// Update template validation
export const updateTemplate = [
  param('id')
    .custom(isUUID)
    .withMessage('Invalid template ID format'),

  body('templateName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Template name cannot be empty')
    .isLength({ min: 3, max: 255 })
    .withMessage('Template name must be between 3 and 255 characters'),

  body('templateDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Template description must be 1000 characters or less'),

  // Include other validations similar to createTemplate but optional
  handleValidationErrors
];

// Book template validation
export const bookTemplate = [
  body('templateId')
    .notEmpty()
    .withMessage('Template ID is required')
    .custom(isUUID)
    .withMessage('Invalid template ID format'),

  body('bookingName')
    .trim()
    .notEmpty()
    .withMessage('Booking name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Booking name must be between 3 and 255 characters'),

  body('departureDate')
    .notEmpty()
    .withMessage('Departure date is required')
    .isISO8601()
    .withMessage('Invalid departure date format')
    .custom((value) => {
      const date = new Date(value);
      return date > new Date();
    })
    .withMessage('Departure date must be in the future'),

  body('returnDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid return date format')
    .custom((value, { req }) => {
      if (value && req.body.departureDate) {
        const returnDate = new Date(value);
        const departureDate = new Date(req.body.departureDate);
        if (returnDate <= departureDate) {
          throw new Error('Return date must be after departure date');
        }
      }
      return true;
    }),

  body('passengerDataIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Passenger data IDs must be an array with 1-100 items'),

  body('passengerDataIds.*')
    .custom(isUUID)
    .withMessage('Each passenger ID must be a valid UUID'),

  body('additionalServices')
    .optional()
    .isArray()
    .withMessage('Additional services must be an array'),

  body('additionalServices.*.name')
    .optional()
    .notEmpty()
    .withMessage('Additional service name is required'),

  body('additionalServices.*.price')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Additional service price must be between 0 and 10000'),

  body('meetingPoints')
    .optional()
    .isArray()
    .withMessage('Meeting points must be an array'),

  body('meetingPoints.*.location')
    .optional()
    .notEmpty()
    .withMessage('Meeting point location is required'),

  body('meetingPoints.*.time')
    .optional()
    .custom(isValidTimeFormat)
    .withMessage('Meeting point time must be in HH:MM format'),

  body('meetingPoints.*.address')
    .optional()
    .notEmpty()
    .withMessage('Meeting point address is required'),

  handleValidationErrors
];

// Bulk operations validation
export const bulkCreate = [
  body('templates')
    .isArray({ min: 1, max: 50 })
    .withMessage('Templates must be an array with 1-50 items'),

  handleValidationErrors
];

export const bulkUpdate = [
  body('updates')
    .isArray({ min: 1, max: 50 })
    .withMessage('Updates must be an array with 1-50 items'),

  body('updates.*.id')
    .notEmpty()
    .withMessage('ID is required for each update')
    .custom(isUUID)
    .withMessage('Invalid template ID format'),

  body('updates.*.data')
    .isObject()
    .withMessage('Data is required for each update'),

  handleValidationErrors
];

export const bulkDelete = [
  body('templateIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Template IDs must be an array with 1-50 items'),

  body('templateIds.*')
    .custom(isUUID)
    .withMessage('Invalid template ID format'),

  handleValidationErrors
];

// Clone template validation
export const cloneTemplate = [
  param('id')
    .custom(isUUID)
    .withMessage('Invalid template ID format'),

  body('newName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('New name must be between 3 and 255 characters'),

  body('targetCompanyId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid target company ID format'),

  handleValidationErrors
];

// Toggle status validation
export const toggleStatus = [
  param('id')
    .custom(isUUID)
    .withMessage('Invalid template ID format'),

  body('isActive')
    .isBoolean()
    .withMessage('isActive must be boolean'),

  handleValidationErrors
];

export const routeTemplateValidator = {
  createTemplate,
  updateTemplate,
  bookTemplate,
  bulkCreate,
  bulkUpdate,
  bulkDelete,
  cloneTemplate,
  toggleStatus
};