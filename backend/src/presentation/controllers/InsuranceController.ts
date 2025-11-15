import { Request, Response, NextFunction } from 'express';
import { GetInsuranceOptionsUseCase } from '@application/use-cases/GetInsuranceOptionsUseCase';
import { InsuranceListResponseDto } from '@application/dto/insurance.dto';
import { ApiResponse } from '@shared/types';

export class InsuranceController {
  constructor(private readonly getInsuranceOptionsUseCase: GetInsuranceOptionsUseCase) {}

  getOptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getInsuranceOptionsUseCase.execute();

      const response: ApiResponse<InsuranceListResponseDto> = {
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}

