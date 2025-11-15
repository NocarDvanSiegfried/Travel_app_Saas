import { User } from '@domain/entities/User';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { ConflictError, ValidationError } from '@shared/errors';
import { RegisterUserDto } from '../dto/auth.dto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для регистрации пользователя
 */
export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    try {
      logger.info('Registering user', { email: dto.email });

      // Проверка существования пользователя
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Хеширование пароля
      const passwordHash = await bcrypt.hash(dto.password, 10);

      // Создание пользователя
      const user = new User(
        uuidv4(),
        dto.email,
        passwordHash,
        dto.fullName,
        dto.phone
      );

      const createdUser = await this.userRepository.create(user);

      logger.info('User registered', { userId: createdUser.id });

      return createdUser;
    } catch (error) {
      logger.error('Error registering user', error);
      throw error;
    }
  }
}

