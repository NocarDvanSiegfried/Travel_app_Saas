import { Request, Response, NextFunction } from 'express';
import { SearchRoutesUseCase } from '@application/use-cases/SearchRoutesUseCase';
import { GetRouteDetailsUseCase } from '@application/use-cases/GetRouteDetailsUseCase';
import { GetRouteRecommendationsUseCase } from '@application/use-cases/GetRouteRecommendationsUseCase';
import { SearchRoutesDtoSchema, GetRouteRecommendationsDtoSchema } from '@application/dto/route.dto';
import { RouteDto, RouteSegmentDto, SearchRoutesResponseDto, RouteDetailsDto, RouteRecommendationResponseDto } from '@application/dto/route.dto';
import { ApiResponse } from '@shared/types';

export class RouteController {
  constructor(
    private readonly searchRoutesUseCase: SearchRoutesUseCase,
    private readonly getRouteDetailsUseCase: GetRouteDetailsUseCase,
    private readonly getRouteRecommendationsUseCase?: GetRouteRecommendationsUseCase
  ) {}

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = SearchRoutesDtoSchema.parse({
        from: req.query.from,
        to: req.query.to,
        date: req.query.date,
        preference: req.query.preference,
      });

      const date = new Date(dto.date);
      const routes = await this.searchRoutesUseCase.execute(
        dto.from,
        dto.to,
        date,
        dto.preference
      );

      const routeDtos: RouteDto[] = routes.map((route) => this.mapToRouteDto(route));

      const response: ApiResponse<SearchRoutesResponseDto> = {
        data: {
          routes: routeDtos,
          total: routeDtos.length,
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
      const routeId = req.params.id;
      const route = await this.getRouteDetailsUseCase.execute(routeId);

      const routeDto: RouteDetailsDto = this.mapToRouteDto(route);

      const response: ApiResponse<RouteDetailsDto> = {
        data: routeDto,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.getRouteRecommendationsUseCase) {
        res.status(501).json({
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Recommendations feature is not available',
          },
        });
        return;
      }

      // Получение userId из токена (если авторизован)
      const userId = (req as any).user?.userId;

      const dto = GetRouteRecommendationsDtoSchema.parse({
        fromCity: req.query.fromCity || req.query.from,
        toCity: req.query.toCity || req.query.to,
        date: req.query.date,
        preference: req.query.preference,
        userId,
      });

      const result = await this.getRouteRecommendationsUseCase.execute(dto);

      const response: ApiResponse<RouteRecommendationResponseDto> = {
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  private mapToRouteDto(route: any): RouteDto {
    const segments: RouteSegmentDto[] = route.segments.map((segment: any) => ({
      id: segment.id,
      transportType: segment.transportType,
      fromCity: segment.fromCity,
      toCity: segment.toCity,
      fromCoordinates: {
        latitude: segment.fromCoordinates.latitude,
        longitude: segment.fromCoordinates.longitude,
      },
      toCoordinates: {
        latitude: segment.toCoordinates.latitude,
        longitude: segment.toCoordinates.longitude,
      },
      departureTime: segment.departureTime.toISOString(),
      arrivalTime: segment.arrivalTime.toISOString(),
      durationMinutes: segment.getDurationMinutes(),
      price: {
        amount: segment.price.amount,
        currency: segment.price.currency,
      },
      carrier: segment.carrier,
      vehicleNumber: segment.vehicleNumber,
    }));

    return {
      id: route.id,
      fromCity: route.fromCity,
      toCity: route.toCity,
      segments,
      totalPrice: {
        amount: route.totalPrice.amount,
        currency: route.totalPrice.currency,
      },
      totalDurationMinutes: route.getTotalDurationMinutes(),
      transfersCount: route.getTransfersCount(),
      riskScore: route.riskScore,
      status: route.status,
    };
  }
}

