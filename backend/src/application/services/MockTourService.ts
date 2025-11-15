import { Tour } from '@domain/entities/Tour';
import { TourComponent } from '@domain/entities/TourComponent';
import { Accommodation } from '@domain/entities/Accommodation';
import { Activity } from '@domain/entities/Activity';
import { Meal } from '@domain/entities/Meal';
import { Price } from '@domain/value-objects/Price';
import { Coordinates } from '@domain/value-objects/Coordinates';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Сервис для работы с mock данными туров
 */
export class MockTourService {
  private tours: Tour[] = [];
  private loaded = false;

  /**
   * Загрузка mock данных из JSON файла
   */
  loadTours(): void {
    if (this.loaded) {
      return;
    }

    try {
      // Поддержка запуска как из корня проекта, так и из папки backend
      const dataDir = fs.existsSync(path.join(process.cwd(), 'data', 'mock-data'))
        ? path.join(process.cwd(), 'data', 'mock-data')
        : path.join(process.cwd(), 'backend', 'data', 'mock-data');
      const toursPath = path.join(dataDir, 'tours.json');

      if (fs.existsSync(toursPath)) {
        const toursData = JSON.parse(fs.readFileSync(toursPath, 'utf-8'));
        this.tours = toursData.map((tourData: any) => this.mapToTour(tourData));
      } else {
        // Инициализация дефолтными данными
        this.initializeDefaultData();
      }

      this.loaded = true;
    } catch (error) {
      console.error('Error loading tours mock data:', error);
      this.initializeDefaultData();
      this.loaded = true;
    }
  }

  /**
   * Инициализация дефолтными данными
   */
  private initializeDefaultData(): void {
    // Пример тура по Якутии
    const accommodation = new Accommodation(
      'acc-1',
      'Отель "Полярная звезда"',
      'hotel',
      'г. Якутск, ул. Ленина, 1',
      new Coordinates(62.0355, 129.6755),
      4.5,
      ['Wi-Fi', 'Завтрак', 'Парковка'],
      new Date('2024-06-15T14:00:00Z'),
      new Date('2024-06-18T12:00:00Z'),
      'Стандартный номер',
      []
    );

    const activity = new Activity(
      'act-1',
      'Экскурсия по Якутску',
      'cultural',
      'Обзорная экскурсия по столице Якутии',
      'г. Якутск',
      new Coordinates(62.0355, 129.6755),
      3,
      new Date('2024-06-16T10:00:00Z'),
      new Date('2024-06-16T13:00:00Z'),
      'easy',
      []
    );

    const meal = new Meal(
      'meal-1',
      'breakfast',
      'Завтрак в отеле',
      'Континентальный завтрак',
      'Отель "Полярная звезда"',
      'г. Якутск',
      new Date('2024-06-16T08:00:00Z'),
      [],
      []
    );

    const component1 = new TourComponent(
      'comp-1',
      'accommodation',
      'Размещение в отеле',
      '3 ночи в отеле',
      new Price(15000),
      accommodation
    );

    const component2 = new TourComponent(
      'comp-2',
      'activity',
      'Экскурсия',
      'Обзорная экскурсия',
      new Price(2000),
      undefined,
      activity
    );

    const component3 = new TourComponent(
      'comp-3',
      'meal',
      'Завтраки',
      '3 завтрака',
      new Price(3000),
      undefined,
      undefined,
      meal
    );

    const tour = new Tour(
      'tour-1',
      'Тур по Якутии "Северное сияние"',
      'Незабываемое путешествие по Якутии с посещением достопримечательностей',
      'Якутск',
      4,
      new Price(20000),
      'available',
      [component1, component2, component3],
      20,
      5,
      new Date('2024-06-15T00:00:00Z'),
      new Date('2024-06-18T23:59:59Z'),
      [],
      ['культура', 'природа', 'экскурсии']
    );

    this.tours = [tour];
  }

  /**
   * Преобразование данных в domain Tour
   */
  private mapToTour(tourData: any): Tour {
    const components = (tourData.components || []).map((compData: any) => {
      let accommodation: Accommodation | undefined;
      let activity: Activity | undefined;
      let meal: Meal | undefined;

      if (compData.accommodation) {
        accommodation = new Accommodation(
          compData.accommodation.id,
          compData.accommodation.name,
          compData.accommodation.type,
          compData.accommodation.address,
          new Coordinates(
            compData.accommodation.coordinates.latitude,
            compData.accommodation.coordinates.longitude
          ),
          compData.accommodation.rating,
          compData.accommodation.amenities,
          compData.accommodation.checkIn ? new Date(compData.accommodation.checkIn) : undefined,
          compData.accommodation.checkOut ? new Date(compData.accommodation.checkOut) : undefined,
          compData.accommodation.roomType,
          compData.accommodation.images
        );
      }

      if (compData.activity) {
        activity = new Activity(
          compData.activity.id,
          compData.activity.name,
          compData.activity.type,
          compData.activity.description,
          compData.activity.location,
          compData.activity.coordinates
            ? new Coordinates(
                compData.activity.coordinates.latitude,
                compData.activity.coordinates.longitude
              )
            : undefined,
          compData.activity.durationHours,
          compData.activity.startTime ? new Date(compData.activity.startTime) : undefined,
          compData.activity.endTime ? new Date(compData.activity.endTime) : undefined,
          compData.activity.difficulty,
          compData.activity.images,
          compData.activity.requirements
        );
      }

      if (compData.meal) {
        meal = new Meal(
          compData.meal.id,
          compData.meal.type,
          compData.meal.name,
          compData.meal.description,
          compData.meal.restaurant,
          compData.meal.location,
          compData.meal.time ? new Date(compData.meal.time) : undefined,
          compData.meal.dietaryOptions,
          compData.meal.menu
        );
      }

      return new TourComponent(
        compData.id,
        compData.type,
        compData.name,
        compData.description,
        new Price(compData.price.amount, compData.price.currency),
        accommodation,
        activity,
        meal,
        compData.transportDetails
          ? {
              ...compData.transportDetails,
              departureTime: compData.transportDetails.departureTime
                ? new Date(compData.transportDetails.departureTime)
                : undefined,
              arrivalTime: compData.transportDetails.arrivalTime
                ? new Date(compData.transportDetails.arrivalTime)
                : undefined,
            }
          : undefined,
        compData.startDate ? new Date(compData.startDate) : undefined,
        compData.endDate ? new Date(compData.endDate) : undefined
      );
    });

    return new Tour(
      tourData.id,
      tourData.title,
      tourData.description,
      tourData.destination,
      tourData.durationDays,
      new Price(tourData.price.amount, tourData.price.currency),
      tourData.status || 'available',
      components,
      tourData.maxParticipants,
      tourData.currentParticipants,
      tourData.startDate ? new Date(tourData.startDate) : undefined,
      tourData.endDate ? new Date(tourData.endDate) : undefined,
      tourData.images,
      tourData.tags
    );
  }

  /**
   * Поиск туров
   */
  findTours(criteria: {
    destination?: string;
    minPrice?: number;
    maxPrice?: number;
    durationDays?: number;
    status?: 'available' | 'sold_out' | 'cancelled';
  }): Tour[] {
    this.loadTours();

    return this.tours.filter(tour => {
      if (criteria.destination && tour.destination.toLowerCase() !== criteria.destination.toLowerCase()) {
        return false;
      }

      if (criteria.minPrice !== undefined && tour.price.amount < criteria.minPrice) {
        return false;
      }

      if (criteria.maxPrice !== undefined && tour.price.amount > criteria.maxPrice) {
        return false;
      }

      if (criteria.durationDays !== undefined && tour.durationDays !== criteria.durationDays) {
        return false;
      }

      if (criteria.status && tour.status !== criteria.status) {
        return false;
      }

      return true;
    });
  }

  /**
   * Получение тура по ID
   */
  findById(id: string): Tour | null {
    this.loadTours();
    return this.tours.find(t => t.id === id) || null;
  }

  /**
   * Проверка доступности
   */
  checkAvailability(tourId: string, participantsCount: number): boolean {
    const tour = this.findById(tourId);
    if (!tour) {
      return false;
    }
    return tour.hasAvailableSpots(participantsCount);
  }
}

