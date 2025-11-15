import { User } from '@domain/entities/User';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { AuthenticationError } from '@shared/errors';
import { LoginUserDto, AuthResponseDto } from '../dto/auth.dto';
import { generateAccessToken, generateRefreshToken } from '@shared/utils/jwt';
import bcrypt from 'bcrypt';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для входа пользователя
 */
export class LoginUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: LoginUserDto): Promise<AuthResponseDto> {
    try {
      logger.info('Logging in user', { email: dto.email });

      // Поиск пользователя
      const user = await this.userRepository.findByEmail(dto.email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Проверка пароля
      const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Генерация токенов
      const tokenPayload = {
        userId: user.id,
        email: user.email,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Обновление времени последнего входа
      const updatedUser = new User(
        user.id,
        user.email,
        user.passwordHash,
        user.fullName,
        user.phone,
        user.avatarUrl,
        user.createdAt,
        user.updatedAt,
        new Date()
      );

      await this.userRepository.update(updatedUser);

      logger.info('User logged in', { userId: user.id });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (error) {
      logger.error('Error logging in user', error);
      throw error;
    }
  }
}

