import { Router } from 'express';
import { InsuranceController } from '../controllers/InsuranceController';
import { GetInsuranceOptionsUseCase } from '@application/use-cases/GetInsuranceOptionsUseCase';
import { MockInsuranceService } from '@application/services/MockInsuranceService';

const router = Router();

// Инициализация зависимостей
const mockInsuranceService = new MockInsuranceService();
const getInsuranceOptionsUseCase = new GetInsuranceOptionsUseCase(mockInsuranceService);

const insuranceController = new InsuranceController(getInsuranceOptionsUseCase);

// Маршруты
router.get('/options', insuranceController.getOptions);

export default router;

