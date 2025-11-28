import { body, param, query, validationResult } from 'express-validator';

// Custom validators
const isValidDate = (value: string) => {
  if (!value) return true;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date > new Date();
};

const isValidFutureDate = (value: string) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return !isNaN(date.getTime()) && date > now;
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

// Search routes validation (POST)
export const searchRoutes = [
  body('origin')
    .notEmpty()
    .withMessage('Origin is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Origin must be between 2 and 255 characters')
    .trim(),

  body('destination')
    .notEmpty()
    .withMessage('Destination is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Destination must be between 2 and 255 characters')
    .trim()
    .custom((value, { req }) => {
      if (value === req.body.origin) {
        throw new Error('Origin and destination must be different');
      }
      return true;
    }),

  body('departureDate')
    .optional()
    .custom(isValidFutureDate)
    .withMessage('Departure date must be in the future'),

  body('returnDate')
    .optional()
    .custom(isValidFutureDate)
    .withMessage('Return date must be in the future')
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

  body('passengers.adults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Adults count must be between 1 and 50'),

  body('passengers.children')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Children count must be between 0 and 20'),

  body('passengers.infants')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Infants count must be between 0 and 10'),

  body('transportPreferences')
    .optional()
    .isArray()
    .withMessage('Transport preferences must be an array')
    .custom((array) => {
      if (array.length === 0) return true;
      if (array.length > 5) {
        throw new Error('Maximum 5 transport types allowed');
      }
      for (const type of array) {
        if (!isValidTransportType(type)) {
          throw new Error(`Invalid transport type: ${type}`);
        }
      }
      return true;
    }),

  body('maxStops')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Max stops must be between 0 and 10'),

  body('maxPrice')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Max price must be between 0 and 1000000'),

  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters')
    .isAlpha()
    .withMessage('Currency must contain only letters'),

  body('riskTolerance')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk tolerance must be low, medium, or high'),

  body('timePreference')
    .optional()
    .isIn(['fastest', 'cheapest', 'balanced'])
    .withMessage('Time preference must be fastest, cheapest, or balanced'),

  body('accessibilityRequired')
    .optional()
    .isBoolean()
    .withMessage('Accessibility required must be boolean'),

  body('vipRequired')
    .optional()
    .isBoolean()
    .withMessage('VIP required must be boolean'),

  body('benefitsRequired')
    .optional()
    .isBoolean()
    .withMessage('Benefits required must be boolean'),

  handleValidationErrors
];

// Search routes validation (GET)
export const searchRoutesQuery = [
  query('origin')
    .notEmpty()
    .withMessage('Origin is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Origin must be between 2 and 255 characters')
    .trim(),

  query('destination')
    .notEmpty()
    .withMessage('Destination is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Destination must be between 2 and 255 characters')
    .trim()
    .custom((value, { req }) => {
      if (value === req.query?.origin) {
        throw new Error('Origin and destination must be different');
      }
      return true;
    }),

  query('departureDate')
    .optional()
    .custom(isValidFutureDate)
    .withMessage('Departure date must be in the future'),

  query('returnDate')
    .optional()
    .custom(isValidFutureDate)
    .withMessage('Return date must be in the future'),

  query('adults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Adults count must be between 1 and 50'),

  query('children')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Children count must be between 0 and 20'),

  query('infants')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Infants count must be between 0 and 10'),

  query('transportTypes')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const types = value.split(',');
      if (types.length > 5) {
        throw new Error('Maximum 5 transport types allowed');
      }
      for (const type of types) {
        if (!isValidTransportType(type.trim())) {
          throw new Error(`Invalid transport type: ${type}`);
        }
      }
      return true;
    }),

  query('maxStops')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Max stops must be between 0 and 10'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Max price must be between 0 and 1000000'),

  query('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),

  query('riskTolerance')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk tolerance must be low, medium, or high'),

  query('timePreference')
    .optional()
    .isIn(['fastest', 'cheapest', 'balanced'])
    .withMessage('Time preference must be fastest, cheapest, or balanced'),

  query('accessibilityRequired')
    .optional()
    .isBoolean()
    .withMessage('Accessibility required must be boolean'),

  query('vipRequired')
    .optional()
    .isBoolean()
    .withMessage('VIP required must be boolean'),

  query('benefitsRequired')
    .optional()
    .isBoolean()
    .withMessage('Benefits required must be boolean'),

  handleValidationErrors
];

// Smart connection planning validation
export const planSmartConnection = [
  body('origin')
    .notEmpty()
    .withMessage('Origin is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Origin must be between 2 and 255 characters'),

  body('destination')
    .notEmpty()
    .withMessage('Destination is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Destination must be between 2 and 255 characters')
    .custom((value, { req }) => {
      if (value === req.body.origin) {
        throw new Error('Origin and destination must be different');
      }
      return true;
    }),

  body('plannedDepartureTime')
    .notEmpty()
    .withMessage('Planned departure time is required')
    .custom(isValidFutureDate)
    .withMessage('Planned departure time must be in the future'),

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

  body('riskTolerance')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Risk tolerance must be low, medium, or high'),

  body('maxTotalTime')
    .optional()
    .isInt({ min: 30, max: 10080 }) // 30 minutes to 1 week
    .withMessage('Max total time must be between 30 and 10080 minutes'),

  body('maxConnections')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Max connections must be between 0 and 10'),

  body('considerWeather')
    .optional()
    .isBoolean()
    .withMessage('Consider weather must be boolean'),

  body('realTimeData')
    .optional()
    .isBoolean()
    .withMessage('Real-time data must be boolean'),

  handleValidationErrors
];

// Route risk analysis validation
export const getRouteRiskAnalysis = [
  query('origin')
    .notEmpty()
    .withMessage('Origin is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Origin must be between 2 and 255 characters'),

  query('destination')
    .notEmpty()
    .withMessage('Destination is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Destination must be between 2 and 255 characters')
    .custom((value, { req }) => {
      if (value === req.query?.origin) {
        throw new Error('Origin and destination must be different');
      }
      return true;
    }),

  query('departureTime')
    .notEmpty()
    .withMessage('Departure time is required')
    .custom(isValidFutureDate)
    .withMessage('Departure time must be in the future'),

  query('transportTypes')
    .notEmpty()
    .withMessage('Transport types are required')
    .custom((value) => {
      if (!value) return true;
      const types = value.split(',');
      if (types.length === 0 || types.length > 5) {
        throw new Error('Transport types must have 1-5 items');
      }
      for (const type of types) {
        if (!isValidTransportType(type.trim())) {
          throw new Error(`Invalid transport type: ${type}`);
        }
      }
      return true;
    }),

  handleValidationErrors
];

// Connection status validation
export const getConnectionStatus = [
  param('connectionId')
    .notEmpty()
    .withMessage('Connection ID is required')
    .isUUID()
    .withMessage('Connection ID must be a valid UUID'),

  handleValidationErrors
];

// Quick search validation
export const quickSearch = [
  query('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .trim(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),

  handleValidationErrors
];

// Popular routes validation
export const getPopularRoutes = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('region')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Region must be between 2 and 50 characters')
    .trim(),

  handleValidationErrors
];

// Search history validation
export const saveSearchHistory = [
  body('searchQuery')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Search query must be between 2 and 500 characters'),

  body('resultsCount')
    .optional()
    .isInt({ min: 0, max: 1000 })
    .withMessage('Results count must be between 0 and 1000'),

  body('selectedOption')
    .optional()
    .isUUID()
    .withMessage('Selected option must be a valid UUID'),

  handleValidationErrors
];

export const getSearchHistory = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),

  handleValidationErrors
];

// Route recommendations validation
export const getRouteRecommendations = [
  query('category')
    .optional()
    .isIn(['business', 'training', 'field_work', 'emergency', 'conference', 'team_building'])
    .withMessage('Invalid category'),

  query('season')
    .optional()
    .isIn(['winter', 'spring', 'summer', 'autumn'])
    .withMessage('Invalid season'),

  query('passengerCount')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Passenger count must be between 1 and 50'),

  handleValidationErrors
];

// Route comparison validation
export const compareRoutes = [
  body('routeIds')
    .isArray({ min: 2, max: 5 })
    .withMessage('Route IDs must be an array with 2-5 items'),

  body('routeIds.*')
    .isUUID()
    .withMessage('Each route ID must be a valid UUID'),

  handleValidationErrors
];

export const searchValidator = {
  searchRoutes,
  searchRoutesQuery,
  planSmartConnection,
  getRouteRiskAnalysis,
  getConnectionStatus,
  quickSearch,
  getPopularRoutes,
  saveSearchHistory,
  getSearchHistory,
  getRouteRecommendations,
  compareRoutes
};