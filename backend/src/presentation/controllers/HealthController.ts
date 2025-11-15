import { Request, Response, NextFunction } from 'express';
import { HealthCheckUseCase } from '@application/use-cases/HealthCheckUseCase';
import { HealthCheckDto } from '@application/dto/health.dto';
import { ApiResponse } from '@shared/types';

export class HealthController {
  constructor(private readonly healthCheckUseCase: HealthCheckUseCase) {}

  check = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.healthCheckUseCase.execute();

      const response: ApiResponse<HealthCheckDto> = {
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
