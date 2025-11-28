import { Router } from 'express';
import { PassengerDataController } from '../controllers/PassengerDataController';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { validateB2BAuth, validateB2BRole } from '../middleware/b2b-auth.middleware';
import { passengerDataValidator } from '../validators/passenger-data.validator';

export function createPassengerDataRoutes(controller: PassengerDataController): Router {
  const router = Router();

  // Apply B2B authentication middleware to all routes
  router.use(validateB2BAuth);

  // Basic CRUD operations
  router.post(
    '/',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    passengerDataValidator.createPassenger,
    controller.createPassenger.bind(controller)
  );

  router.get(
    '/',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'accountant', 'employee']),
    controller.searchPassengers.bind(controller)
  );

  router.get(
    '/company',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'accountant', 'employee']),
    controller.getCompanyPassengers.bind(controller)
  );

  router.get(
    '/:id',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'accountant', 'employee']),
    controller.getPassenger.bind(controller)
  );

  router.put(
    '/:id',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    passengerDataValidator.updatePassenger,
    controller.updatePassenger.bind(controller)
  );

  router.delete(
    '/:id',
    validateB2BRole(['admin', 'manager']),
    controller.deletePassenger.bind(controller)
  );

  // Bulk operations
  router.post(
    '/bulk',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    passengerDataValidator.bulkCreate,
    controller.bulkCreatePassengers.bind(controller)
  );

  router.put(
    '/bulk',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    passengerDataValidator.bulkUpdate,
    controller.bulkUpdatePassengers.bind(controller)
  );

  router.delete(
    '/bulk',
    validateB2BRole(['admin', 'manager']),
    passengerDataValidator.bulkDelete,
    controller.bulkDeletePassengers.bind(controller)
  );

  // Import/Export operations
  router.post(
    '/import/csv',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    uploadMiddleware.single('csvFile'),
    controller.importFromCSV.bind(controller)
  );

  router.get(
    '/export/csv',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'accountant']),
    controller.exportToCSV.bind(controller)
  );

  // Verification operations
  router.post(
    '/:id/verify',
    validateB2BRole(['admin', 'manager']),
    controller.verifyPassenger.bind(controller)
  );

  router.post(
    '/bulk/verify',
    validateB2BRole(['admin', 'manager']),
    passengerDataValidator.bulkVerify,
    controller.bulkVerifyPassengers.bind(controller)
  );

  // Benefits management
  router.post(
    '/benefits/expiry/update',
    validateB2BRole(['admin', 'manager']),
    controller.updateBenefitsExpiryStatus.bind(controller)
  );

  // Statistics and analytics
  router.get(
    '/statistics/company',
    validateB2BRole(['admin', 'manager', 'accountant', 'booking_agent']),
    controller.getPassengerStatistics.bind(controller)
  );

  // Search and filtering
  router.get(
    '/search/suitable',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    controller.findSuitablePassengers.bind(controller)
  );

  // Discount and pricing
  router.get(
    '/:id/discount-eligibility',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    controller.getPassengerDiscountEligibility.bind(controller)
  );

  return router;
}