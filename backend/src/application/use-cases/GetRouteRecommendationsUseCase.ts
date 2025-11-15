import { RouteRecommendation } from '@domain/entities/RouteRecommendation';
import { Route } from '@domain/entities/Route';
import { UserPreferences } from '@domain/value-objects/UserPreferences';
import { RoutePreferenceType as SimpleRoutePreferenceType } from '@domain/value-objects/RoutePreference';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { AIRecommendationService } from '../services/AIRecommendationService';
import { MockRouteService } from '../services/MockRouteService';
import { logger } from '@shared/utils/logger';
import { GetRouteRecommendationsDto, RouteRecommendationResponseDto } from '../dto/route.dto';

/**
 * Use-case для получения ИИ-рекомендаций маршрутов
 */
export class GetRouteRecommendationsUseCase {
  constructor(
    private readonly mockRouteService: MockRouteService,
    private readonly aiRecommendationService: AIRecommendationService,
    private readonly userRepository?: IUserRepository,
    private readonly orderRepository?: IOrderRepository
  ) {}

  async execute(dto: GetRouteRecommendationsDto): Promise<RouteRecommendationResponseDto> {
    try {
      logger.info('Getting route recommendations', {
        fromCity: dto.fromCity,
        toCity: dto.toCity,
        date: dto.date,
        userId: dto.userId,
      });

      // Маппинг предпочтений для MockRouteService (fastest -> fast, cheapest -> cheap, most_reliable -> reliable)
      const mapPreference = (
        pref?: 'fastest' | 'cheapest' | 'most_reliable'
      ): SimpleRoutePreferenceType | undefined => {
        if (!pref) return undefined;
        const mapping: Record<'fastest' | 'cheapest' | 'most_reliable', SimpleRoutePreferenceType> = {
          fastest: 'fast',
          cheapest: 'cheap',
          most_reliable: 'reliable',
        };
        return mapping[pref];
      };

      // Поиск маршрутов
      const routes = this.mockRouteService.filterRoutes(
        dto.fromCity,
        dto.toCity,
        new Date(dto.date),
        mapPreference(dto.preference)
      );

      if (routes.length === 0) {
        return {
          recommendations: [],
          message: 'Маршруты не найдены',
        };
      }

      // Получение предпочтений пользователя (если авторизован)
      let userPreferences: UserPreferences | undefined;
      let userTravelHistory: string[] | undefined;

      if (dto.userId && this.userRepository && this.orderRepository) {
        const user = await this.userRepository.findById(dto.userId);
        if (user) {
          // Создание предпочтений на основе запроса
          userPreferences = new UserPreferences(
            dto.preference || 'most_reliable',
            'medium' // Можно расширить, добавив в профиль пользователя
          );

          // Получение истории заказов для анализа
          const userOrders = await this.orderRepository.findByUserId(dto.userId);
          userTravelHistory = userOrders
            .map(order => {
              // Извлечение городов из заказов (упрощенная версия)
              // В реальности нужно получать route из order
              return [];
            })
            .flat();
        }
      } else {
        // Для неавторизованных пользователей используем базовые предпочтения
        userPreferences = new UserPreferences(dto.preference || 'most_reliable');
      }

      // Генерация рекомендаций
      const recommendations = this.aiRecommendationService.generateRecommendations(
        routes,
        userPreferences,
        userTravelHistory
      );

      logger.info('Route recommendations generated', {
        count: recommendations.length,
        userId: dto.userId,
      });

      // Преобразование в DTO
      return {
        recommendations: recommendations.map(rec => ({
          id: rec.id,
          route: {
            id: rec.route.id,
            fromCity: rec.route.fromCity,
            toCity: rec.route.toCity,
            segments: rec.route.segments.map(seg => ({
              id: seg.id,
              transportType: seg.transportType,
              fromCity: seg.fromCity,
              toCity: seg.toCity,
              departureTime: seg.departureTime.toISOString(),
              arrivalTime: seg.arrivalTime.toISOString(),
              price: {
                amount: seg.price.amount,
                currency: seg.price.currency,
              },
              carrier: seg.carrier,
              vehicleNumber: seg.vehicleNumber,
            })),
            totalPrice: {
              amount: rec.route.totalPrice.amount,
              currency: rec.route.totalPrice.currency,
            },
            totalDurationMinutes: rec.route.getTotalDurationMinutes(),
            transfersCount: rec.route.getTransfersCount(),
            riskScore: rec.route.riskScore,
            status: rec.route.status,
          },
          score: rec.score,
          explanation: rec.explanation,
          reasons: rec.reasons,
          personalizedFactors: rec.personalizedFactors,
        })),
        message: recommendations.length > 0 ? 'Рекомендации успешно сгенерированы' : 'Рекомендации не найдены',
      };
    } catch (error) {
      logger.error('Error getting route recommendations', error);
      throw error;
    }
  }
}

