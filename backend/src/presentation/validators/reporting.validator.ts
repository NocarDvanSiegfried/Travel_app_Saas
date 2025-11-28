import { body, query, ValidationChain } from 'express-validator';

export const validateReportFilters: ValidationChain[] = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID format'),

  body('dateStart')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('dateEnd')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.dateStart)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('costCenterIds')
    .optional()
    .isArray()
    .withMessage('Cost center IDs must be an array')
    .custom((value) => {
      if (!value.every((id: string) => typeof id === 'string')) {
        throw new Error('All cost center IDs must be strings');
      }
      return true;
    }),

  body('userIds')
    .optional()
    .isArray()
    .withMessage('User IDs must be an array'),

  body('transactionTypes')
    .optional()
    .isArray()
    .withMessage('Transaction types must be an array')
    .custom((value) => {
      const validTypes = ['deposit', 'withdrawal', 'refund', 'refund_pending', 'fee', 'credit', 'debit'];
      if (!value.every((type: string) => validTypes.includes(type))) {
        throw new Error('Invalid transaction type');
      }
      return true;
    }),

  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),

  body('includeRefunds')
    .optional()
    .isBoolean()
    .withMessage('Include refunds must be boolean'),

  body('includeDeposits')
    .optional()
    .isBoolean()
    .withMessage('Include deposits must be boolean'),

  body('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be a positive number'),

  body('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be a positive number')
    .custom((value, { req }) => {
      const minAmount = parseFloat(req.body.minAmount || 0);
      if (parseFloat(value) < minAmount) {
        throw new Error('Maximum amount must be greater than minimum amount');
      }
      return true;
    })
];

export const validateDocumentGeneration: ValidationChain[] = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID format'),

  body('periodStart')
    .notEmpty()
    .withMessage('Period start date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('periodEnd')
    .notEmpty()
    .withMessage('Period end date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.periodStart)) {
        throw new Error('Period end must be after period start');
      }
      return true;
    }),

  body('documentType')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['act', 'invoice', 'upd', 'certificate'])
    .withMessage('Invalid document type'),

  body('clientInfo.name')
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ max: 255 })
    .withMessage('Client name must be less than 255 characters'),

  body('clientInfo.inn')
    .optional()
    .matches(/^\d{10,12}$/)
    .withMessage('Invalid INN format'),

  body('clientInfo.kpp')
    .optional()
    .matches(/^\d{9}$/)
    .withMessage('Invalid KPP format'),

  body('clientInfo.address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),

  body('clientInfo.bankAccount')
    .optional()
    .matches(/^\d{20}$/)
    .withMessage('Invalid bank account format'),

  body('clientInfo.bankName')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Bank name must be less than 255 characters'),

  body('clientInfo.bankBik')
    .optional()
    .matches(/^\d{9}$/)
    .withMessage('Invalid BIK format'),

  body('contractInfo.number')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Contract number must be less than 100 characters'),

  body('contractInfo.date')
    .optional()
    .isISO8601()
    .withMessage('Invalid contract date format'),

  body('contractInfo.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Contract description must be less than 1000 characters'),

  body('vatAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('VAT amount must be a positive number'),

  body('serviceDescription')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Service description must be less than 1000 characters'),

  body('includeElectronicSignature')
    .optional()
    .isBoolean()
    .withMessage('Include electronic signature must be boolean')
];

export const validateMonthlyPackageGeneration: ValidationChain[] = [
  body('year')
    .notEmpty()
    .withMessage('Year is required')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030'),

  body('month')
    .notEmpty()
    .withMessage('Month is required')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),

  body('clientInfo.name')
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ max: 255 })
    .withMessage('Client name must be less than 255 characters'),

  body('clientInfo.inn')
    .optional()
    .matches(/^\d{10,12}$/)
    .withMessage('Invalid INN format'),

  body('clientInfo.kpp')
    .optional()
    .matches(/^\d{9}$/)
    .withMessage('Invalid KPP format'),

  body('clientInfo.address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),

  body('clientInfo.bankAccount')
    .optional()
    .matches(/^\d{20}$/)
    .withMessage('Invalid bank account format'),

  body('clientInfo.bankName')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Bank name must be less than 255 characters'),

  body('clientInfo.bankBik')
    .optional()
    .matches(/^\d{9}$/)
    .withMessage('Invalid BIK format'),

  body('contractInfo.number')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Contract number must be less than 100 characters'),

  body('contractInfo.date')
    .optional()
    .isISO8601()
    .withMessage('Invalid contract date format'),

  body('contractInfo.description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Contract description must be less than 1000 characters')
];

export const validateDocumentSignature: ValidationChain[] = [
  body('signatureCertificateId')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Signature certificate ID must be less than 100 characters')
];

export const validateExportOptions: ValidationChain[] = [
  body('format')
    .notEmpty()
    .withMessage('Export format is required')
    .isIn(['csv', 'excel', 'pdf'])
    .withMessage('Invalid export format'),

  body('options.includeHeaders')
    .optional()
    .isBoolean()
    .withMessage('Include headers must be boolean'),

  body('options.includeCostCenters')
    .optional()
    .isBoolean()
    .withMessage('Include cost centers must be boolean'),

  body('options.includeUserDetails')
    .optional()
    .isBoolean()
    .withMessage('Include user details must be boolean'),

  body('options.includeTransactionDetails')
    .optional()
    .isBoolean()
    .withMessage('Include transaction details must be boolean'),

  body('options.includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be boolean'),

  body('options.language')
    .optional()
    .isIn(['ru', 'en'])
    .withMessage('Language must be ru or en'),

  body('options.dateFormat')
    .optional()
    .isIn(['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
    .withMessage('Invalid date format')
];

export const validateDocumentFilters: ValidationChain[] = [
  query('documentType')
    .optional()
    .isIn(['act', 'invoice', 'upd', 'certificate'])
    .withMessage('Invalid document type'),

  query('documentStatus')
    .optional()
    .isIn(['generated', 'sent', 'signed', 'cancelled'])
    .withMessage('Invalid document status'),

  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  query('reportingPeriodFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  query('reportingPeriodTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  query('costCenterId')
    .optional()
    .isUUID()
    .withMessage('Invalid cost center ID format'),

  query('hasDiscrepancies')
    .optional()
    .isBoolean()
    .withMessage('Has discrepancies must be boolean'),

  query('isUnsigned')
    .optional()
    .isBoolean()
    .withMessage('Is unsigned must be boolean'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),

  query('sortBy')
    .optional()
    .isIn([
      'created_at', 'document_date', 'document_number', 'total_amount',
      'reporting_period_start', 'document_status', 'document_type'
    ])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

export const validateTransactionFilters: ValidationChain[] = [
  query('dateStart')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  query('dateEnd')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.query.dateStart as string)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  query('costCenterIds')
    .optional()
    .custom((value) => {
      const ids = Array.isArray(value) ? value : value.split(',');
      return ids.every((id: string) => typeof id === 'string');
    })
    .withMessage('Invalid cost center IDs format'),

  query('userIds')
    .optional()
    .custom((value) => {
      const ids = Array.isArray(value) ? value : value.split(',');
      return ids.every((id: string) => typeof id === 'string');
    })
    .withMessage('Invalid user IDs format'),

  query('transactionTypes')
    .optional()
    .custom((value) => {
      const types = Array.isArray(value) ? value : value.split(',');
      const validTypes = ['deposit', 'withdrawal', 'refund', 'refund_pending', 'fee', 'credit', 'debit'];
      return types.every((type: string) => validTypes.includes(type));
    })
    .withMessage('Invalid transaction types'),

  query('categories')
    .optional()
    .custom((value) => {
      const cats = Array.isArray(value) ? value : value.split(',');
      return cats.every((cat: string) => typeof cat === 'string');
    })
    .withMessage('Invalid categories format'),

  query('includeRefunds')
    .optional()
    .isBoolean()
    .withMessage('Include refunds must be boolean'),

  query('includeDeposits')
    .optional()
    .isBoolean()
    .withMessage('Include deposits must be boolean'),

  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be a positive number'),

  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be a positive number')
    .custom((value, { req }) => {
      const minAmount = parseFloat(req.query.minAmount as string || '0');
      if (parseFloat(value) < minAmount) {
        throw new Error('Maximum amount must be greater than minimum amount');
      }
      return true;
    })
];