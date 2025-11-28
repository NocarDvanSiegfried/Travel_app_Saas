import { Router } from 'express';
import { InstantRefundController } from '../controllers/InstantRefundController';
import { validateB2BAuth, validateB2BRole } from '../middleware/b2b-auth.middleware';
import { refundValidator } from '../validators/refund.validator';

export function createInstantRefundRoutes(controller: InstantRefundController): Router {
  const router = Router();

  // Apply B2B authentication to all routes
  router.use(validateB2BAuth);

  // Main refund operations
  router.post(
    '/process',
    validateB2BRole(['admin', 'manager', 'booking_agent', 'accountant']),
    refundValidator.processRefund,
    controller.processRefund.bind(controller)
  );

  router.post(
    '/check-eligibility',
    validateB2BRole(['admin', 'manager', 'booking_agent', 'accountant', 'employee']),
    refundValidator.checkEligibility,
    controller.checkRefundEligibility.bind(controller)
  );

  // Refund status and tracking
  router.get(
    '/:refundId/status',
    validateB2BRole(['admin', 'manager', 'booking_agent', 'accountant', 'employee']),
    controller.getRefundStatus.bind(controller)
  );

  router.post(
    '/:refundId/cancel',
    validateB2BRole(['admin', 'manager']),
    refundValidator.cancelRefund,
    controller.cancelRefund.bind(controller)
  );

  // Analytics and reporting
  router.get(
    '/statistics',
    validateB2BRole(['admin', 'manager', 'accountant']),
    controller.getRefundStatistics.bind(controller)
  );

  router.get(
    '/history',
    validateB2BRole(['admin', 'manager', 'accountant', 'booking_agent']),
    controller.getRefundHistory.bind(controller)
  );

  // Refund policies management
  router.get(
    '/policies',
    validateB2BRole(['admin', 'manager', 'booking_agent']),
    controller.getRefundPolicies.bind(controller)
  );

  router.put(
    '/policies/:policyId',
    validateB2BRole(['admin', 'manager']),
    refundValidator.updatePolicy,
    controller.updateRefundPolicy.bind(controller)
  );

  return router;
}