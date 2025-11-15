import { Router } from 'express';
import { StorageController } from '../controllers/StorageController';
import { UpdateAvatarUseCase, IStorageService } from '@application/use-cases/UpdateAvatarUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { UserRepository } from '@infrastructure/repositories/UserRepository';
import { getPresignedUrlForAvatar, getAvatarUrl, checkStorageConnection } from '@infrastructure/storage/MinIOClient';
import { authenticate } from '../middleware';

const router = Router();

// Инициализация зависимостей
const userRepository: IUserRepository = new UserRepository();

// Storage service implementation
const storageService: IStorageService = {
  async getPresignedUrlForAvatar(userId: string, contentType: string) {
    return await getPresignedUrlForAvatar(userId, contentType);
  },
  getAvatarUrl(userId: string) {
    return getAvatarUrl(userId);
  },
};

const updateAvatarUseCase = new UpdateAvatarUseCase(userRepository, storageService);
const storageController = new StorageController(updateAvatarUseCase);

// Маршруты (требуют аутентификации)
router.post('/avatar', authenticate, storageController.uploadAvatar);

export default router;

