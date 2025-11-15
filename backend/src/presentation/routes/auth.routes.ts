import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { RegisterUserUseCase } from '@application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '@application/use-cases/LoginUserUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { UserRepository } from '@infrastructure/repositories/UserRepository';
import { authenticate } from '../middleware';

const router = Router();

// Инициализация зависимостей
const userRepository: IUserRepository = new UserRepository();
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const loginUserUseCase = new LoginUserUseCase(userRepository);
const authController = new AuthController(registerUserUseCase, loginUserUseCase, userRepository);

// Маршруты
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/profile', authenticate, authController.profile);

export default router;

