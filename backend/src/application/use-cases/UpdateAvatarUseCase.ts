import { User } from '@domain/entities/User';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { NotFoundError } from '@shared/errors';
import { PresignedUrlDto } from '../dto/storage.dto';
import { logger } from '@shared/utils/logger';

/**
 * Интерфейс для storage сервиса
 */
export interface IStorageService {
  getPresignedUrlForAvatar(userId: string, contentType: string): Promise<PresignedUrlDto>;
  getAvatarUrl(userId: string): string;
}

/**
 * Use-case для обновления аватара пользователя
 */
export class UpdateAvatarUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly storageService: IStorageService
  ) {}

  async execute(userId: string, contentType: string): Promise<{ presignedUrl: PresignedUrlDto; avatarUrl: string }> {
    try {
      logger.info('Updating user avatar', { userId });

      // Проверка существования пользователя
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      // Получение presigned URL
      const presignedUrl = await this.storageService.getPresignedUrlForAvatar(userId, contentType);
      const avatarUrl = this.storageService.getAvatarUrl(userId);

      // Обновление URL аватара в базе данных
      const updatedUser = new User(
        user.id,
        user.email,
        user.passwordHash,
        user.fullName,
        user.phone,
        avatarUrl,
        user.createdAt,
        new Date(),
        user.lastLoginAt
      );

      await this.userRepository.update(updatedUser);

      logger.info('User avatar updated', { userId });

      return {
        presignedUrl,
        avatarUrl,
      };
    } catch (error) {
      logger.error('Error updating user avatar', error);
      throw error;
    }
  }
}

