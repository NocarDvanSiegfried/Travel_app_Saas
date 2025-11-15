import { z } from 'zod';

/**
 * DTO для регистрации пользователя
 */
export const RegisterUserDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
});

export type RegisterUserDto = z.infer<typeof RegisterUserDtoSchema>;

/**
 * DTO для входа пользователя
 */
export const LoginUserDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserDto = z.infer<typeof LoginUserDtoSchema>;

/**
 * DTO для обновления refresh token
 */
export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

/**
 * DTO ответа аутентификации
 */
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
  };
}

/**
 * DTO профиля пользователя
 */
export interface UserProfileDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

