import { Request, Response, NextFunction } from 'express';
import { SearchToursUseCase } from '@application/use-cases/SearchToursUseCase';
import { GetTourDetailsUseCase } from '@application/use-cases/GetTourDetailsUseCase';
import { CreateTourOrderUseCase } from '@application/use-cases/CreateTourOrderUseCase';
import { SearchToursDtoSchema, CreateTourOrderDtoSchema } from '@application/dto/tour.dto';
import { SearchToursResponseDto, TourOrderDto } from '@application/dto/tour.dto';
import { ApiResponse } from '@shared/types';

export class TourController {
  constructor(
    private readonly searchToursUseCase: SearchToursUseCase,
    private readonly getTourDetailsUseCase: GetTourDetailsUseCase,
    private readonly createTourOrderUseCase: CreateTourOrderUseCase
  ) {}

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = SearchToursDtoSchema.parse({
        destination: req.query.destination,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        durationDays: req.query.durationDays ? Number(req.query.durationDays) : undefined,
        status: req.query.status,
      });

      const tours = await this.searchToursUseCase.execute(dto);

      const response: ApiResponse<SearchToursResponseDto> = {
        data: {
          tours,
          total: tours.length,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tourId = req.params.id;
      const tour = await this.getTourDetailsUseCase.execute(tourId);

      const response: ApiResponse<typeof tour> = {
        data: tour,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
          },
        });
        return;
      }

      const dto = CreateTourOrderDtoSchema.parse(req.body);
      const order = await this.createTourOrderUseCase.execute(userId, dto);

      const response: ApiResponse<TourOrderDto> = {
        data: order,
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };
}

