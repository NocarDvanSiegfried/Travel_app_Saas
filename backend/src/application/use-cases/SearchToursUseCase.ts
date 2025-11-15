import { Tour } from '@domain/entities/Tour';
import { MockTourService } from '../services/MockTourService';
import { SearchToursDto, TourDto } from '../dto/tour.dto';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для поиска туров
 */
export class SearchToursUseCase {
  constructor(private readonly mockTourService: MockTourService) {}

  async execute(dto: SearchToursDto): Promise<TourDto[]> {
    try {
      logger.info('Searching tours', dto);

      const tours = this.mockTourService.findTours({
        destination: dto.destination,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
        durationDays: dto.durationDays,
        status: dto.status,
      });

      return tours.map(tour => this.mapToDto(tour));
    } catch (error) {
      logger.error('Error searching tours', error);
      throw error;
    }
  }

  private mapToDto(tour: Tour): TourDto {
    return {
      id: tour.id,
      title: tour.title,
      description: tour.description,
      destination: tour.destination,
      durationDays: tour.durationDays,
      price: {
        amount: tour.price.amount,
        currency: tour.price.currency,
      },
      status: tour.status,
      components: tour.components.map(comp => ({
        id: comp.id,
        type: comp.type,
        name: comp.name,
        description: comp.description,
        price: {
          amount: comp.price.amount,
          currency: comp.price.currency,
        },
        accommodation: comp.accommodation
          ? {
              id: comp.accommodation.id,
              name: comp.accommodation.name,
              type: comp.accommodation.type,
              address: comp.accommodation.address,
              coordinates: {
                latitude: comp.accommodation.coordinates.latitude,
                longitude: comp.accommodation.coordinates.longitude,
              },
              rating: comp.accommodation.rating,
              amenities: comp.accommodation.amenities,
            }
          : undefined,
        activity: comp.activity
          ? {
              id: comp.activity.id,
              name: comp.activity.name,
              type: comp.activity.type,
              description: comp.activity.description,
              location: comp.activity.location,
              durationHours: comp.activity.durationHours,
            }
          : undefined,
        meal: comp.meal
          ? {
              id: comp.meal.id,
              type: comp.meal.type,
              name: comp.meal.name,
              description: comp.meal.description,
            }
          : undefined,
      })),
      maxParticipants: tour.maxParticipants,
      currentParticipants: tour.currentParticipants,
      startDate: tour.startDate?.toISOString(),
      endDate: tour.endDate?.toISOString(),
      images: tour.images,
      tags: tour.tags,
      isAvailable: tour.isAvailable(),
    };
  }
}

