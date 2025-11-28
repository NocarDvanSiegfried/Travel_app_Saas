import { body, param, validationResult } from 'express-validator';

// Custom validator for UUID
const isUUID = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Custom validator for date format
const isValidDate = (value: string) => {
  if (!value) return true;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

// Custom validator for birth date (not in future, reasonable age)
const isValidBirthDate = (value: string) => {
  if (!value) return false;
  const birthDate = new Date(value);
  const now = new Date();
  const age = now.getFullYear() - birthDate.getFullYear();

  return birthDate < now && age >= 0 && age <= 120;
};

// Handle validation errors
export const handleValidationErrors = (req: any, res: any, next: any) => {
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

// Create passenger validation
export const createPassenger = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .custom(isUUID)
    .withMessage('Invalid company ID format'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[а-яёa-zA-Z\s\-']+$/i)
    .withMessage('Last name contains invalid characters'),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[а-яёa-zA-Z\s\-']+$/i)
    .withMessage('First name contains invalid characters'),

  body('middleName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Middle name must be 100 characters or less')
    .matches(/^[а-яёa-zA-Z\s\-']*$/i)
    .withMessage('Middle name contains invalid characters'),

  body('birthDate')
    .notEmpty()
    .withMessage('Birth date is required')
    .custom(isValidBirthDate)
    .withMessage('Invalid birth date'),

  body('passportSeries')
    .optional()
    .trim()
    .matches(/^[0-9]{4}$/)
    .withMessage('Passport series must be 4 digits'),

  body('passportNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Passport number must be 6 digits'),

  body('passportIssueDate')
    .optional()
    .custom(isValidDate)
    .withMessage('Invalid passport issue date format'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('hasBenefits')
    .optional()
    .isBoolean()
    .withMessage('hasBenefits must be boolean'),

  body('benefitType')
    .if(body('hasBenefits').equals('true'))
    .notEmpty()
    .withMessage('Benefit type is required when benefits are enabled')
    .isIn(['veteran', 'disabled', 'student', 'pensioner', 'subsidized'])
    .withMessage('Invalid benefit type'),

  body('benefitCertificateNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Benefit certificate number must be 100 characters or less'),

  body('benefitExpiryDate')
    .optional()
    .custom(isValidDate)
    .withMessage('Invalid benefit expiry date format'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be 100 characters or less'),

  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be 100 characters or less'),

  body('costCenterId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid cost center ID format'),

  body('isCompanyManager')
    .optional()
    .isBoolean()
    .withMessage('isCompanyManager must be boolean'),

  body('requiresSpecialAssistance')
    .optional()
    .isBoolean()
    .withMessage('requiresSpecialAssistance must be boolean'),

  body('specialAssistanceNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special assistance notes must be 500 characters or less'),

  body('isVip')
    .optional()
    .isBoolean()
    .withMessage('isVip must be boolean'),

  body('employeeId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid employee ID format'),

  handleValidationErrors
];

// Update passenger validation
export const updatePassenger = [
  param('id')
    .custom(isUUID)
    .withMessage('Invalid passenger ID format'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Last name must be 100 characters or less')
    .matches(/^[а-яёa-zA-Z\s\-']+$/i)
    .withMessage('Last name contains invalid characters'),

  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('First name must be 100 characters or less')
    .matches(/^[а-яёa-zA-Z\s\-']+$/i)
    .withMessage('First name contains invalid characters'),

  body('middleName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Middle name must be 100 characters or less')
    .matches(/^[а-яёa-zA-Z\s\-']*$/i)
    .withMessage('Middle name contains invalid characters'),

  body('birthDate')
    .optional()
    .custom(isValidBirthDate)
    .withMessage('Invalid birth date'),

  body('passportSeries')
    .optional()
    .trim()
    .matches(/^[0-9]{4}$/)
    .withMessage('Passport series must be 4 digits'),

  body('passportNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Passport number must be 6 digits'),

  body('passportIssueDate')
    .optional()
    .custom(isValidDate)
    .withMessage('Invalid passport issue date format'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('hasBenefits')
    .optional()
    .isBoolean()
    .withMessage('hasBenefits must be boolean'),

  body('benefitType')
    .optional()
    .isIn(['veteran', 'disabled', 'student', 'pensioner', 'subsidized'])
    .withMessage('Invalid benefit type'),

  body('benefitCertificateNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Benefit certificate number must be 100 characters or less'),

  body('benefitExpiryDate')
    .optional()
    .custom(isValidDate)
    .withMessage('Invalid benefit expiry date format'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be 100 characters or less'),

  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be 100 characters or less'),

  body('costCenterId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid cost center ID format'),

  body('isCompanyManager')
    .optional()
    .isBoolean()
    .withMessage('isCompanyManager must be boolean'),

  body('requiresSpecialAssistance')
    .optional()
    .isBoolean()
    .withMessage('requiresSpecialAssistance must be boolean'),

  body('specialAssistanceNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special assistance notes must be 500 characters or less'),

  body('isVip')
    .optional()
    .isBoolean()
    .withMessage('isVip must be boolean'),

  body('employeeId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid employee ID format'),

  handleValidationErrors
];

// Bulk create validation
export const bulkCreate = [
  body('passengers')
    .isArray({ min: 1, max: 100 })
    .withMessage('Passengers must be an array with 1-100 items'),

  body('passengers.*.companyId')
    .notEmpty()
    .withMessage('Company ID is required for each passenger')
    .custom(isUUID)
    .withMessage('Invalid company ID format'),

  body('passengers.*.lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required for each passenger')
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),

  body('passengers.*.firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required for each passenger')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),

  body('passengers.*.birthDate')
    .notEmpty()
    .withMessage('Birth date is required for each passenger')
    .custom(isValidBirthDate)
    .withMessage('Invalid birth date'),

  handleValidationErrors
];

// Bulk update validation
export const bulkUpdate = [
  body('updates')
    .isArray({ min: 1, max: 100 })
    .withMessage('Updates must be an array with 1-100 items'),

  body('updates.*.id')
    .notEmpty()
    .withMessage('ID is required for each update')
    .custom(isUUID)
    .withMessage('Invalid passenger ID format'),

  body('updates.*.data')
    .isObject()
    .withMessage('Data is required for each update'),

  handleValidationErrors
];

// Bulk delete validation
export const bulkDelete = [
  body('passengerIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Passenger IDs must be an array with 1-100 items'),

  body('passengerIds.*')
    .custom(isUUID)
    .withMessage('Invalid passenger ID format'),

  handleValidationErrors
];

// Bulk verify validation
export const bulkVerify = [
  body('passengerIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Passenger IDs must be an array with 1-100 items'),

  body('passengerIds.*')
    .custom(isUUID)
    .withMessage('Invalid passenger ID format'),

  handleValidationErrors
];

// Search passengers query validation
export const searchPassengers = [
  body('searchQuery')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department filter must be 100 characters or less'),

  body('category')
    .optional()
    .isIn(['adult', 'child', 'student', 'senior', 'disabled'])
    .withMessage('Invalid category filter'),

  body('hasBenefits')
    .optional()
    .isBoolean()
    .withMessage('hasBenefits filter must be boolean'),

  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified filter must be boolean'),

  body('costCenterId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid cost center ID format'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),

  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative integer'),

  handleValidationErrors
];

// Export passengers validation
export const exportPassengers = [
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department filter must be 100 characters or less'),

  body('category')
    .optional()
    .isIn(['adult', 'child', 'student', 'senior', 'disabled'])
    .withMessage('Invalid category filter'),

  body('hasBenefits')
    .optional()
    .isBoolean()
    .withMessage('hasBenefits filter must be boolean'),

  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified filter must be boolean'),

  body('costCenterId')
    .optional()
    .custom(isUUID)
    .withMessage('Invalid cost center ID format'),

  body('searchQuery')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  handleValidationErrors
];

export const passengerDataValidator = {
  createPassenger,
  updatePassenger,
  bulkCreate,
  bulkUpdate,
  bulkDelete,
  bulkVerify,
  searchPassengers,
  exportPassengers
};