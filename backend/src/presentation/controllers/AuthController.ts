import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '@application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '@application/use-cases/LoginUserUseCase';
import { RegisterUserDtoSchema, LoginUserDtoSchema, RefreshTokenDtoSchema } from '@application/dto/auth.dto';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@shared/utils/jwt';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { validate } from '../middleware/validation.middleware';
import { ApiResponse } from '@shared/types';
import { AuthResponseDto, UserProfileDto } from '@application/dto/auth.dto';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly userRepository: IUserRepository
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = RegisterUserDtoSchema.parse(req.body);
      const user = await this.registerUserUseCase.execute(dto);

      const tokenPayload = {
        userId: user.id,
        email: user.email,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const response: ApiResponse<AuthResponseDto> = {
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
          },
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = LoginUserDtoSchema.parse(req.body);
      const result = await this.loginUserUseCase.execute(dto);

      const response: ApiResponse<AuthResponseDto> = {
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = RefreshTokenDtoSchema.parse(req.body);
      const payload = verifyRefreshToken(dto.refreshToken);

      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      const response: ApiResponse<{ accessToken: string; refreshToken: string }> = {
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  profile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const user = await this.userRepository.findById(req.user.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const profile: UserProfileDto = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt?.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
      };

      const response: ApiResponse<UserProfileDto> = {
        data: profile,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

