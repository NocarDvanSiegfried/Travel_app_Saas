import { Request, Response, NextFunction } from 'express';
import { UpdateAvatarUseCase } from '@application/use-cases/UpdateAvatarUseCase';
import { UploadAvatarDtoSchema } from '@application/dto/storage.dto';
import { UploadAvatarResponseDto } from '@application/dto/storage.dto';
import { ApiResponse } from '@shared/types';

export class StorageController {
  constructor(private readonly updateAvatarUseCase: UpdateAvatarUseCase) {}

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      // Валидация content-type из заголовка
      const contentType = req.headers['content-type'] || 'image/jpeg';
      UploadAvatarDtoSchema.parse({
        contentType,
        fileSize: parseInt(req.headers['content-length'] || '0', 10),
      });

      const result = await this.updateAvatarUseCase.execute(req.user.userId, contentType);

      const response: ApiResponse<UploadAvatarResponseDto> = {
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

