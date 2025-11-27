/**
 * Калькулятор реалистичных путей для разных типов транспорта
 * 
 * Генерирует координаты пути, который выглядит реалистично:
 * - Авиа: ломаная линия через хабы
 * - Автобус: путь по дорогам (через OSRM с кэшированием)
 * - Паром: путь по реке (упрощённая модель)
 * - ЖД: путь по железной дороге (упрощённая модель)
 * - Зимник: путь по зимней дороге (упрощённая модель)
 */

import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { Hub } from '../../../domain/smart-routing/entities/Hub';
import type { CityConnection } from '../../../domain/smart-routing/data/connections-model';
import { OsrmClient } from '../../../infrastructure/api/osrm/OsrmClient';
import type { ICacheService } from '../../../infrastructure/cache/ICacheService';
import { getCityById } from '../../../domain/smart-routing/data/cities-reference';

/**
 * Геометрия пути для визуализации
 */
export interface PathGeometry {
  /**
   * Тип геометрии (всегда 'LineString')
   */
  type: 'LineString';

  /**
   * Координаты пути [longitude, latitude]
   */
  coordinates: [number, number][];
}

/**
 * Калькулятор реалистичных путей
 */
export class RealisticPathCalculator {
  /**
   * OSRM клиент для получения маршрутов по дорогам
   */
  private readonly osrmClient: OsrmClient;

  constructor(cache?: ICacheService | null) {
    this.osrmClient = new OsrmClient(undefined, cache);
  }

  /**
   * Валидирует координаты pathGeometry
   * Удаляет NaN, null, undefined и невалидные значения
   */
  private validatePathGeometry(geometry: PathGeometry): PathGeometry {
    if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) {
      throw new Error('Invalid pathGeometry: missing coordinates array');
    }

    const validCoordinates: [number, number][] = geometry.coordinates.filter(
      (coord): coord is [number, number] => {
        if (!Array.isArray(coord) || coord.length !== 2) {
          return false;
        }
        const [lng, lat] = coord;
        return (
          typeof lng === 'number' &&
          typeof lat === 'number' &&
          !isNaN(lng) &&
          !isNaN(lat) &&
          isFinite(lng) &&
          isFinite(lat) &&
          lng !== null &&
          lat !== null &&
          lng !== undefined &&
          lat !== undefined &&
          lng >= -180 &&
          lng <= 180 &&
          lat >= -90 &&
          lat <= 90
        );
      }
    );

    if (validCoordinates.length < 2) {
      throw new Error('Invalid pathGeometry: less than 2 valid coordinates');
    }

    return {
      type: 'LineString',
      coordinates: validCoordinates,
    };
  }
  /**
   * Вычисляет путь для авиа через хабы
   * 
   * Создаёт ломаную линию: from → hub1 → hub2 → ... → to
   * 
   * ВАЖНО: Авиа-линии должны быть ломаные, а не прямые.
   * Путь проходит через все указанные хабы для реалистичной визуализации.
   * 
   * @param from - Координаты начальной точки (аэропорт отправления)
   * @param to - Координаты конечной точки (аэропорт назначения)
   * @param viaHubs - Массив хабов, через которые проходит маршрут
   * 
   * @example
   * // Сегмент от малого аэропорта до регионального хаба:
   * // viaHubs = [yakutsk-hub]
   * // Результат: [srednekolymsk] → [yakutsk-hub] → [yakutsk]
   * 
   * @example
   * // Сегмент между двумя хабами:
   * // viaHubs = [moscow-hub, novosibirsk-hub]
   * // Результат: [moscow] → [moscow-hub] → [novosibirsk-hub] → [novosibirsk]
   */
  public calculateAirplanePath(
    from: Coordinates,
    to: Coordinates,
    viaHubs: Hub[]
  ): PathGeometry {
    const coordinates: [number, number][] = [];

    // Начальная точка (аэропорт отправления)
    coordinates.push(from.toGeoJSON());

    // Промежуточные хабы (создают ломаную линию)
    // Для каждого сегмента передаются только релевантные хабы:
    // - Для сегмента fromCity → firstHub: viaHubs = [firstHub]
    // - Для сегмента currentHub → nextHub: viaHubs = [currentHub, nextHub]
    // - Для сегмента lastHub → toCity: viaHubs = [lastHub]
    for (const hub of viaHubs) {
      coordinates.push(hub.coordinates.toGeoJSON());
    }

    // Конечная точка (аэропорт назначения)
    coordinates.push(to.toGeoJSON());

    // ВАЖНО: Если viaHubs пуст, путь будет прямой линией (только для прямых рейсов между хабами)
    // Для всех остальных случаев viaHubs должен содержать хотя бы один хаб

    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates,
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Вычисляет путь для автобуса по дорогам через OSRM
   * 
   * Использует OSRM API с кэшированием и fallback на упрощённые пути.
   * ВАЖНО: Автобусы НЕ ДОЛЖНЫ быть прямыми линиями - они должны идти по реальным дорогам.
   * 
   * @param from - Координаты начальной точки
   * @param to - Координаты конечной точки
   * @param intermediateCities - Промежуточные города (из connection.intermediateCities)
   */
  public async calculateBusPath(
    from: Coordinates,
    to: Coordinates,
    intermediateCities?: Coordinates[]
  ): Promise<PathGeometry> {
    try {
      // Используем OSRM клиент с кэшированием и fallback
      // Пытаемся получить маршрут с приоритетом федеральных дорог
      const result = await this.osrmClient.getRouteWithFederalRoadsPriority({
        from,
        to,
        via: intermediateCities,
        profile: 'driving',
        overview: 'full', // Полная геометрия для реалистичной визуализации
        steps: false,
      });

      // ВАЖНО: Проверяем, что путь не является прямой линией
      // Автобусы НЕ ДОЛЖНЫ быть прямыми линиями - они должны идти по реальным дорогам
      // Если путь содержит только 2 точки (начало и конец), это подозрительно
      if (result.geometry.coordinates.length <= 2) {
        const distance = this.calculateHaversineDistance(from, to);
        // Если расстояние больше 1 км, путь должен содержать больше точек
        if (distance > 1000) {
          console.warn(
            `[RealisticPathCalculator] OSRM вернул путь с ${result.geometry.coordinates.length} точками для маршрута длиной ${distance.toFixed(0)} м. Используем fallback для создания реалистичного пути.`
          );
          return this.createFallbackBusPath(from, to, intermediateCities);
        }
        // Для очень коротких маршрутов (< 1 км) 2 точки могут быть нормальными
        // Но всё равно создаём путь с извилистостью для реалистичности
        console.warn(
          `[RealisticPathCalculator] OSRM вернул путь с ${result.geometry.coordinates.length} точками. Создаём путь с извилистостью для реалистичности.`
        );
        return this.createFallbackBusPath(from, to, intermediateCities);
      }

      // Валидация координат из OSRM
      const validatedGeometry = this.validatePathGeometry(result.geometry);
      return validatedGeometry;
    } catch (error) {
      console.warn(
        `[RealisticPathCalculator] Ошибка при получении маршрута через OSRM, используем упрощённый путь:`,
        error instanceof Error ? error.message : error
      );

      // Fallback: создаём реалистичный путь через промежуточные точки
      return this.createFallbackBusPath(from, to, intermediateCities);
    }
  }

  /**
   * Создаёт fallback путь для автобуса
   * 
   * Создаёт путь, который НЕ является прямой линией, а имитирует реальную дорогу
   */
  private createFallbackBusPath(
    from: Coordinates,
    to: Coordinates,
    intermediateCities?: Coordinates[]
  ): PathGeometry {
    // Если есть промежуточные города, используем их
    if (intermediateCities && intermediateCities.length > 0) {
      return this.calculatePathViaIntermediatePoints(from, to, intermediateCities);
    }

    // Если промежуточных городов нет, создаём путь с извилистостью
    // Это НЕ прямая линия, а путь, имитирующий реальную дорогу
    const coordinates: [number, number][] = [];
    const distance = this.calculateHaversineDistance(from, to);
    const numPoints = Math.max(3, Math.ceil(distance / 30000)); // Точка каждые ~30 км

    // Начальная точка
    coordinates.push(from.toGeoJSON());

    // Промежуточные точки с извилистостью
    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      const lat = from.latitude + (to.latitude - from.latitude) * t;
      const lng = from.longitude + (to.longitude - from.longitude) * t;

      // Добавляем извилистость (в пределах 3% от расстояния)
      // Это имитирует реальную дорогу, которая не является прямой линией
      const offset = (Math.sin(t * Math.PI * 1.5) * 0.03 * distance) / 111000;
      const offsetLat = lat + offset * Math.cos(t * Math.PI * 2.5);
      const offsetLng = lng + offset * Math.sin(t * Math.PI * 2.5);

      coordinates.push([offsetLng, offsetLat]);
    }

    // Конечная точка
    coordinates.push(to.toGeoJSON());

    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates,
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Вычисляет путь для парома по реке
   * 
   * Создаёт путь, который следует руслу реки с волнистой линией.
   * ВАЖНО: Паромы НЕ ДОЛЖНЫ быть прямыми - они должны идти вдоль рек волнистой линией.
   * 
   * @param from - Координаты начальной пристани
   * @param to - Координаты конечной пристани
   * @param intermediatePiers - Промежуточные пристани (из connection.intermediateCities)
   * @param riverName - Название реки (Лена, Алдан, Вилюй) для определения коэффициента извилистости
   */
  public calculateFerryPath(
    from: Coordinates,
    to: Coordinates,
    intermediatePiers?: Coordinates[],
    riverName?: string
  ): PathGeometry {
    const coordinates: [number, number][] = [];

    // Определяем коэффициент извилистости в зависимости от реки
    // Лена: 1.15-1.2 (средняя извилистость)
    // Алдан: 1.2-1.3 (высокая извилистость)
    // Вилюй: 1.15-1.2 (средняя извилистость)
    let riverCoefficient = 1.2; // По умолчанию
    if (riverName === 'Лена' || riverName === 'Вилюй') {
      riverCoefficient = 1.18; // Средняя извилистость
    } else if (riverName === 'Алдан') {
      riverCoefficient = 1.25; // Высокая извилистость
    }

    // Начальная точка
    coordinates.push(from.toGeoJSON());

    // Если есть промежуточные пристани (например, устье реки), используем их
    if (intermediatePiers && intermediatePiers.length > 0) {
      // Добавляем все промежуточные пристани с волнистой линией между ними
      let currentFrom = from;
      
      for (const pier of intermediatePiers) {
        // Создаём волнистую линию от currentFrom до pier
        const segment = this.createWavyRiverPath(currentFrom, pier, riverCoefficient);
        // Добавляем все точки кроме первой (чтобы не дублировать)
        coordinates.push(...segment.coordinates.slice(1));
        currentFrom = pier;
      }
      
      // Создаём волнистую линию от последней промежуточной пристани до конечной
      const finalSegment = this.createWavyRiverPath(currentFrom, to, riverCoefficient);
      coordinates.push(...finalSegment.coordinates.slice(1));
    } else {
      // Если промежуточных пристаней нет, создаём волнистую линию напрямую
      const segment = this.createWavyRiverPath(from, to, riverCoefficient);
      coordinates.push(...segment.coordinates.slice(1)); // Пропускаем первую точку (уже добавлена)
    }

    // Гарантируем, что путь не является прямой линией (минимум 3 точки)
    if (coordinates.length < 3) {
      // Добавляем промежуточную точку для создания волнистой линии
      const midLat = (from.latitude + to.latitude) / 2;
      const midLng = (from.longitude + to.longitude) / 2;
      const distance = this.calculateHaversineDistance(from, to);
      const offset = (0.03 * distance) / 111000; // 3% от расстояния
      coordinates.splice(1, 0, [midLng + offset, midLat + offset]);
    }

    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates,
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Создаёт волнистую линию вдоль реки
   * 
   * Использует комбинацию синусоидальных функций для создания более реалистичной
   * волнистой линии, которая имитирует извилистость реки.
   * 
   * Улучшения:
   * - Больше точек для плавности (каждые ~20 км вместо ~30 км)
   * - Комбинация нескольких синусоидальных волн для более естественного вида
   * - Увеличенная амплитуда для более заметной волнистости
   */
  private createWavyRiverPath(
    from: Coordinates,
    to: Coordinates,
    riverCoefficient: number
  ): PathGeometry {
    const coordinates: [number, number][] = [];
    const distance = this.calculateHaversineDistance(from, to);
    
    // Создаём больше точек для более плавной волнистой линии
    // Точка каждые ~20 км для лучшей визуализации (было ~30 км)
    const numPoints = Math.max(5, Math.ceil(distance / 20000));

    // Начальная точка
    coordinates.push(from.toGeoJSON());

    // Вычисляем направление движения
    const angle = Math.atan2(to.latitude - from.latitude, to.longitude - from.longitude);
    const perpendicularAngle = angle + Math.PI / 2;

    // Создаём волнистую линию с использованием комбинации синусоидальных функций
    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      const lat = from.latitude + (to.latitude - from.latitude) * t;
      const lng = from.longitude + (to.longitude - from.longitude) * t;

      // Комбинация нескольких синусоидальных волн для более естественного вида
      // Основная волна (4 периода)
      const wave1 = Math.sin(t * Math.PI * 4);
      // Вторичная волна (6 периодов) для дополнительной извилистости
      const wave2 = Math.sin(t * Math.PI * 6) * 0.5;
      // Третичная волна (8 периодов) для мелких изгибов
      const wave3 = Math.sin(t * Math.PI * 8) * 0.3;
      
      // Комбинируем волны
      const combinedWave = wave1 + wave2 + wave3;
      
      // Амплитуда волны зависит от коэффициента извилистости реки
      // Увеличиваем амплитуду для более заметной волнистости
      const waveAmplitude = (riverCoefficient - 1.0) * 0.6; // Увеличено с 0.5 до 0.6
      const offset = (combinedWave * waveAmplitude * distance) / 111000;
      
      // Применяем смещение перпендикулярно направлению движения
      const offsetLat = lat + offset * Math.cos(perpendicularAngle);
      const offsetLng = lng + offset * Math.sin(perpendicularAngle);

      coordinates.push([offsetLng, offsetLat]);
    }

    // Конечная точка
    coordinates.push(to.toGeoJSON());

    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates,
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Вычисляет путь для ЖД по железной дороге
   * 
   * Создаёт путь, который следует железной дороге (АЯМ или Транссиб).
   * ВАЖНО: ЖД-линии НЕ ДОЛЖНЫ быть прямыми - они должны идти вдоль существующих трасс.
   * 
   * @param from - Координаты начальной станции
   * @param to - Координаты конечной станции
   * @param intermediateStations - Промежуточные станции (из connection.intermediateCities)
   * @param railCoefficient - Коэффициент извилистости ЖД-линии (1.1-1.2)
   */
  public calculateTrainPath(
    from: Coordinates,
    to: Coordinates,
    intermediateStations?: Coordinates[],
    railCoefficient: number = 1.15
  ): PathGeometry {
    const coordinates: [number, number][] = [];

    // Начальная точка
    coordinates.push(from.toGeoJSON());

    // Если есть промежуточные станции, используем их для создания ломаной линии
    if (intermediateStations && intermediateStations.length > 0) {
      // Добавляем все промежуточные станции
      for (const station of intermediateStations) {
        coordinates.push(station.toGeoJSON());
      }
    } else {
      // Если промежуточных станций нет, создаём путь с извилистостью
      // ЖД-линии не являются прямыми - они следуют рельефу местности
      const distance = this.calculateHaversineDistance(from, to);
      const numPoints = Math.max(3, Math.ceil(distance / 80)); // Точка каждые ~80 км

      for (let i = 1; i < numPoints; i++) {
        const t = i / numPoints;
        const lat = from.latitude + (to.latitude - from.latitude) * t;
        const lng = from.longitude + (to.longitude - from.longitude) * t;

        // Добавляем небольшие обходы (в пределах 2-3% от расстояния)
        // Это имитирует реальную ЖД-линию, которая следует рельефу местности
        const offset = (Math.sin(t * Math.PI * 1.2) * 0.025 * distance) / 111000;
        const offsetLat = lat + offset * Math.cos(t * Math.PI * 2.2);
        const offsetLng = lng + offset * Math.sin(t * Math.PI * 2.2);

        coordinates.push([offsetLng, offsetLat]);
      }
    }

    // Конечная точка
    coordinates.push(to.toGeoJSON());

    // Гарантируем, что путь не является прямой линией (минимум 3 точки)
    if (coordinates.length < 3) {
      // Добавляем промежуточную точку для создания ломаной линии
      const midLat = (from.latitude + to.latitude) / 2;
      const midLng = (from.longitude + to.longitude) / 2;
      const distance = this.calculateHaversineDistance(from, to);
      const offset = (0.02 * distance) / 111000; // 2% от расстояния
      coordinates.splice(1, 0, [midLng + offset, midLat + offset]);
    }

    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates,
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Вычисляет путь для зимника
   * 
   * Создаёт путь, который следует зимней дороге (упрощённая модель)
   */
  /**
   * Вычисляет путь для зимника (зимней дороги)
   * 
   * Создаёт путь с обходами препятствий (тундра, замёрзшие реки).
   * ВАЖНО: Зимники НЕ ДОЛЖНЫ быть прямыми - они должны идти в обход препятствий.
   * Визуализируется пунктирной линией для отличия от других типов транспорта.
   * 
   * @param from - Координаты начальной точки
   * @param to - Координаты конечной точки
   * @param intermediatePoints - Промежуточные точки (если есть)
   */
  public calculateWinterRoadPath(
    from: Coordinates,
    to: Coordinates,
    intermediatePoints?: Coordinates[]
  ): PathGeometry {
    // Улучшённая модель: создаём путь с большими обходами (зимники часто идут в обход препятствий)
    const coordinates: [number, number][] = [];
    const distance = this.calculateHaversineDistance(from, to);

    // Начальная точка
    coordinates.push(from.toGeoJSON());

    // Если есть промежуточные точки, используем их
    if (intermediatePoints && intermediatePoints.length > 0) {
      let currentFrom = from;
      
      for (const point of intermediatePoints) {
        // Создаём путь от currentFrom до промежуточной точки
        const segment = this.createWinterRoadSegment(currentFrom, point);
        // Добавляем все точки кроме первой (чтобы не дублировать)
        coordinates.push(...segment.coordinates.slice(1));
        currentFrom = point;
      }
      
      // Создаём путь от последней промежуточной точки до конечной
      const finalSegment = this.createWinterRoadSegment(currentFrom, to);
      coordinates.push(...finalSegment.coordinates.slice(1));
    } else {
      // Если промежуточных точек нет, создаём путь напрямую
      const segment = this.createWinterRoadSegment(from, to);
      coordinates.push(...segment.coordinates.slice(1)); // Пропускаем первую точку (уже добавлена)
    }

    // Гарантируем, что путь не является прямой линией (минимум 3 точки)
    if (coordinates.length < 3) {
      // Добавляем промежуточную точку для создания обхода
      const midLat = (from.latitude + to.latitude) / 2;
      const midLng = (from.longitude + to.longitude) / 2;
      const offset = (0.06 * distance) / 111000; // 6% от расстояния (увеличено с 5%)
      coordinates.splice(1, 0, [midLng + offset, midLat + offset]);
    }

    return {
      type: 'LineString',
      coordinates,
    };
  }

  /**
   * Создаёт сегмент зимней дороги с обходами препятствий
   * 
   * Зимники часто идут в обход препятствий (тундра, замёрзшие реки, холмы).
   * Создаём путь с большими обходами для реалистичности.
   * Улучшено: больше точек (каждые ~20 км) и более выраженные обходы (12-15% от расстояния).
   */
  private createWinterRoadSegment(
    from: Coordinates,
    to: Coordinates
  ): PathGeometry {
    const coordinates: [number, number][] = [];
    const distance = this.calculateHaversineDistance(from, to);
    
    // Создаём больше точек для более реалистичного пути
    // Точка каждые ~20 км для лучшей визуализации (как для паромов)
    const numPoints = Math.max(5, Math.ceil(distance / 20000));

    // Начальная точка
    coordinates.push(from.toGeoJSON());

    // Вычисляем направление движения
    const angle = Math.atan2(to.latitude - from.latitude, to.longitude - from.longitude);
    const perpendicularAngle = angle + Math.PI / 2;

    // Создаём путь с обходами препятствий
    for (let i = 1; i < numPoints; i++) {
      const t = i / numPoints;
      const lat = from.latitude + (to.latitude - from.latitude) * t;
      const lng = from.longitude + (to.longitude - from.longitude) * t;

      // Комбинация нескольких синусоидальных функций для создания обходов
      // Основная волна (1.5 периода) - большие обходы
      const wave1 = Math.sin(t * Math.PI * 1.5);
      // Вторичная волна (3 периода) - средние обходы
      const wave2 = Math.sin(t * Math.PI * 3) * 0.5;
      // Третичная волна (4.5 периодов) - мелкие обходы
      const wave3 = Math.sin(t * Math.PI * 4.5) * 0.3;
      
      // Комбинируем волны
      const combinedWave = wave1 + wave2 + wave3;
      
      // Амплитуда обхода зависит от расстояния (12-15% от расстояния для зимников)
      // Увеличено с 10% до 12% для более выраженных обходов
      const offsetAmplitude = 0.12; // 12% от расстояния
      const offset = (combinedWave * offsetAmplitude * distance) / 111000;
      
      // Применяем смещение перпендикулярно направлению движения
      const offsetLat = lat + offset * Math.cos(perpendicularAngle);
      const offsetLng = lng + offset * Math.sin(perpendicularAngle);

      coordinates.push([offsetLng, offsetLat]);
    }

    // Конечная точка
    coordinates.push(to.toGeoJSON());

    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates,
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Вычисляет путь для такси (городские дороги)
   */
  public async calculateTaxiPath(
    from: Coordinates,
    to: Coordinates
  ): Promise<PathGeometry> {
    // Для такси используем OSRM (городские дороги)
    return this.calculateBusPath(from, to);
  }

  /**
   * Вычисляет путь для сегмента маршрута
   */
  public async calculatePathForSegment(
    transportType: TransportType,
    from: Coordinates,
    to: Coordinates,
    connection?: CityConnection,
    viaHubs?: Hub[]
  ): Promise<PathGeometry> {
    switch (transportType) {
      case TransportType.AIRPLANE:
        return this.calculateAirplanePath(from, to, viaHubs || []);

      case TransportType.BUS:
        // Преобразуем промежуточные города из connection в Coordinates
        const intermediateCities = connection?.intermediateCities
          ? connection.intermediateCities
              .map((item) => {
                // Если это строка (ID города), ищем город
                if (typeof item === 'string') {
                  // Явно приводим к string для type safety
                  const cityId: string = item;
                  const city = getCityById(cityId);
                  if (!city) {
                    return null;
                  }
                  return new Coordinates(city.coordinates.latitude, city.coordinates.longitude);
                }
                // Если это объект с координатами, используем напрямую
                if (typeof item === 'object' && item !== null && 'latitude' in item && 'longitude' in item) {
                  return new Coordinates(
                    item.latitude as number,
                    item.longitude as number
                  );
                }
                return null;
              })
              .filter((c): c is Coordinates => c !== null)
          : undefined;
        return this.calculateBusPath(from, to, intermediateCities);

      case TransportType.TRAIN:
        // Преобразуем промежуточные города из connection в Coordinates
        const intermediateStations = connection?.intermediateCities
          ? connection.intermediateCities
              .map((item) => {
                // Если это строка (ID города), ищем город
                if (typeof item === 'string') {
                  // Явно приводим к string для type safety
                  const cityId: string = item;
                  const city = getCityById(cityId);
                  if (!city) {
                    return null;
                  }
                  return new Coordinates(city.coordinates.latitude, city.coordinates.longitude);
                }
                // Если это объект с координатами, используем напрямую
                if (typeof item === 'object' && item !== null && 'latitude' in item && 'longitude' in item) {
                  return new Coordinates(
                    item.latitude as number,
                    item.longitude as number
                  );
                }
                return null;
              })
              .filter((c): c is Coordinates => c !== null)
          : undefined;
        return this.calculateTrainPath(from, to, intermediateStations);

      case TransportType.FERRY:
        // Преобразуем промежуточные точки из connection в Coordinates
        // intermediateCities может содержать:
        // 1. ID городов (строки) - преобразуем через getCityById
        // 2. Объекты с координатами {latitude, longitude} - используем напрямую
        const intermediatePiers = connection?.intermediateCities
          ? connection.intermediateCities
              .map((item) => {
                // Если это строка (ID города), ищем город
                if (typeof item === 'string') {
                  const city = getCityById(item);
                  if (!city) {
                    return null;
                  }
                  return new Coordinates(city.coordinates.latitude, city.coordinates.longitude);
                }
                // Если это объект с координатами, используем напрямую
                if (typeof item === 'object' && item !== null && 'latitude' in item && 'longitude' in item) {
                  return new Coordinates(
                    item.latitude as number,
                    item.longitude as number
                  );
                }
                return null;
              })
              .filter((c): c is Coordinates => c !== null)
          : undefined;
        // Получаем название реки из метаданных
        const riverName = connection?.metadata?.river as string | undefined;
        return this.calculateFerryPath(from, to, intermediatePiers, riverName);

      case TransportType.WINTER_ROAD:
        // Преобразуем промежуточные точки из connection в Coordinates
        const intermediateWinterPoints = connection?.intermediateCities
          ? connection.intermediateCities
              .map((item) => {
                // Если это строка (ID города), ищем город
                if (typeof item === 'string') {
                  const city = getCityById(item);
                  if (!city) {
                    return null;
                  }
                  return new Coordinates(city.coordinates.latitude, city.coordinates.longitude);
                }
                // Если это объект с координатами, используем напрямую
                if (typeof item === 'object' && item !== null && 'latitude' in item && 'longitude' in item) {
                  return new Coordinates(
                    item.latitude as number,
                    item.longitude as number
                  );
                }
                return null;
              })
              .filter((c): c is Coordinates => c !== null)
          : undefined;
        return this.calculateWinterRoadPath(from, to, intermediateWinterPoints);

      case TransportType.TAXI:
        return this.calculateTaxiPath(from, to);

      default:
        // Fallback на прямую линию
        return this.createStraightLinePath(from, to);
    }
  }

  /**
   * Создаёт путь через промежуточные точки
   */
  private calculatePathViaIntermediatePoints(
    from: Coordinates,
    to: Coordinates,
    intermediate: Coordinates[]
  ): PathGeometry {
    const coordinates: [number, number][] = [];

    coordinates.push(from.toGeoJSON());

    for (const point of intermediate) {
      coordinates.push(point.toGeoJSON());
    }

    coordinates.push(to.toGeoJSON());

    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates,
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Создаёт прямую линию (fallback)
   */
  private createStraightLinePath(
    from: Coordinates,
    to: Coordinates
  ): PathGeometry {
    const geometry: PathGeometry = {
      type: 'LineString',
      coordinates: [from.toGeoJSON(), to.toGeoJSON()],
    };

    // Валидация координат
    return this.validatePathGeometry(geometry);
  }

  /**
   * Вычисляет расстояние по Haversine (вспомогательный метод)
   */
  private calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Радиус Земли в километрах
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLon = this.toRad(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.latitude)) *
        Math.cos(this.toRad(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Преобразует градусы в радианы
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

