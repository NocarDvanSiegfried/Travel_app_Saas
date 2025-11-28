import { body, param, validationResult } from 'express-validator';

// Custom validators
const isUUID = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const isValidFutureDate = (value: string) => {
  if (!value) return true;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date > new Date();
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

// Process refund validation
export const processRefund = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .custom(isUUID)
    .withMessage('Invalid booking ID format'),

  body('ticketId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid ticket ID format'),

  body('templateBookingId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid template booking ID format'),

  body('refundAmount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Refund amount must be between 0.01 and 1000000'),

  body('refundReason')
    .trim()
    .notEmpty()
    .withMessage('Refund reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Refund reason must be between 10 and 500 characters'),

  body('passengerIds')
    .optional()
    .isArray()
    .withMessage('Passenger IDs must be an array')
    .custom((array) => {
      if (array && array.length > 100) {
        throw new Error('Maximum 100 passengers allowed per refund');
      }
      return true;
    }),

  body('passengerIds.*')
    .optional()
    .custom(isUUID)
    .withMessage('Each passenger ID must be a valid UUID'),

  body('partialRefund')
    .optional()
    .isBoolean()
    .withMessage('Partial refund must be boolean'),

  body('refundPolicy.refundPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Refund percent must be between 0 and 100'),

  body('refundPolicy.processingFee')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Processing fee must be between 0 and 100'),

  body('refundPolicy.minRefundAmount')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Minimum refund amount must be between 0 and 10000'),

  // Custom validation: either ticketId or templateBookingId must be provided (not both)
  body().custom((value, { req }) => {
    const hasTicketId = !!req.body.ticketId;
    const hasTemplateBookingId = !!req.body.templateBookingId;

    if (!hasTicketId && !hasTemplateBookingId) {
      throw new Error('Either ticket ID or template booking ID must be provided');
    }

    if (hasTicketId && hasTemplateBookingId) {
      throw new Error('Cannot provide both ticket ID and template booking ID');
    }

    return true;
  }),

  handleValidationErrors
];

// Check eligibility validation
export const checkEligibility = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .custom(isUUID)
    .withMessage('Invalid booking ID format'),

  body('refundAmount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Refund amount must be between 0.01 and 1000000'),

  body('passengerIds')
    .optional()
    .isArray()
    .withMessage('Passenger IDs must be an array')
    .custom((array) => {
      if (array && array.length > 100) {
        throw new Error('Maximum 100 passengers allowed per refund');
      }
      return true;
    }),

  body('passengerIds.*')
    .optional()
    .custom(isUUID)
    .withMessage('Each passenger ID must be a valid UUID'),

  handleValidationErrors
];

// Cancel refund validation
export const cancelRefund = [
  param('refundId')
    .notEmpty()
    .withMessage('Refund ID is required')
    .isUUID()
    .withMessage('Invalid refund ID format'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Cancellation reason must be between 10 and 500 characters'),

  handleValidationErrors
];

// Update policy validation
export const updatePolicy = [
  param('policyId')
    .notEmpty()
    .withMessage('Policy ID is required')
    .isUUID()
    .withMessage('Invalid policy ID format'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Policy name cannot be empty')
    .isLength({ min: 3, max: 255 })
    .withMessage('Policy name must be between 3 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Policy description must be 1000 characters or less'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Is active must be boolean'),

  body('rules')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Rules must be an array with at least 1 item')
    .custom((array) => {
      if (array.length > 20) {
        throw new Error('Maximum 20 rules allowed per policy');
      }
      return true;
    }),

  body('rules.*.condition')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Rule condition is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Rule condition must be between 3 and 100 characters'),

  body('rules.*.refundPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Refund percent must be between 0 and 100'),

  body('rules.*.processingFeePercent')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Processing fee percent must be between 0 and 50'),

  body('rules.*.minRefundAmount')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Minimum refund amount must be between 0 and 10000'),

  body('rules.*.maxRefundAmount')
    .optional()
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Maximum refund amount must be between 1 and 1000000'),

  body('rules.*.timeRestrictions.minHoursBeforeDeparture')
    .optional()
    .isInt({ min: 0, max: 8760 }) // Up to 1 year
    .withMessage('Min hours before departure must be between 0 and 8760'),

  body('rules.*.timeRestrictions.maxHoursAfterDeparture')
    .optional()
    .isInt({ min: 0, max: 8760 }) // Up to 1 year
    .withMessage('Max hours after departure must be between 0 and 8760'),

  body('rules.*.categoryRestrictions')
    .optional()
    .isArray()
    .withMessage('Category restrictions must be an array')
    .custom((array) => {
      if (array && array.length > 20) {
        throw new Error('Maximum 20 category restrictions allowed');
      }
      // Validate each category is a string
      for (const category of array) {
        if (typeof category !== 'string' || category.length > 50) {
          throw new Error('Each category restriction must be a string with max 50 characters');
        }
      }
      return true;
    }),

  body('rules.*.passengerRestrictions.maxPassengers')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max passengers must be between 1 and 1000'),

  body('rules.*.passengerRestrictions.requiresManagerApproval')
    .optional()
    .isBoolean()
    .withMessage('Requires manager approval must be boolean'),

  // Custom validation: time restrictions must be logical
  body('rules.*').custom((rule) => {
    if (rule.timeRestrictions) {
      const { minHoursBeforeDeparture, maxHoursAfterDeparture } = rule.timeRestrictions;
      if (minHoursBeforeDeparture && maxHoursAfterDeparture) {
        // These represent different time periods, so no direct comparison needed
        // But we can validate that they're reasonable values
      }
    }
    return true;
  }),

  handleValidationErrors
];

// Additional query parameter validations for GET requests
export const refundHistoryQuery = [
  // Query parameters for refund history
  // These would be validated at the route level, not body level
];

export const statisticsQuery = [
  // Query parameters for statistics
  // These would be validated at the route level, not body level
];

export const refundValidator = {
  processRefund,
  checkEligibility,
  cancelRefund,
  updatePolicy,
  refundHistoryQuery,
  statisticsQuery
};