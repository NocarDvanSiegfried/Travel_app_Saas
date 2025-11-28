/**
 * City Factory
 * 
 * Фабрика для создания тестовых городов.
 * Детерминированные, реалистичные данные без случайности.
 */

import { City, type ICity } from '../../domain/smart-routing/entities/City';
import { Coordinates } from '../../domain/smart-routing/value-objects/Coordinates';
import { HubLevel } from '../../domain/smart-routing/enums/HubLevel';
import type { AdministrativeStructure } from '../../domain/smart-routing/entities/AdministrativeStructure';
import { createAdministrativeStructure } from '../../domain/smart-routing/entities/AdministrativeStructure';
import type { IStop } from '../../domain/smart-routing/entities/Stop';
import { Stop } from '../../domain/smart-routing/entities/Stop';

/**
 * Параметры для создания города
 */
export interface CityFactoryParams {
  id?: string;
  name?: string;
  normalizedName?: string;
  coordinates?: Coordinates;
  timezone?: string;
  population?: number;
  isKeyCity?: boolean;
  isHub?: boolean;
  hubLevel?: HubLevel;
  infrastructure?: ICity['infrastructure'];
  stops?: IStop[];
  synonyms?: string[];
  administrative?: AdministrativeStructure;
}

/**
 * Создаёт mock город с реалистичными данными
 */
export function generateMockCity(params: CityFactoryParams = {}): City {
  const id = params.id || 'test-city';
  const name = params.name || 'Тестовый город';
  const normalizedName = params.normalizedName || name.toLowerCase();
  const coordinates = params.coordinates || new Coordinates(62.0278, 129.7042); // Якутск по умолчанию
  const timezone = params.timezone || 'Asia/Yakutsk';
  const isKeyCity = params.isKeyCity ?? false;
  const isHub = params.isHub ?? false;
  const hubLevel = params.hubLevel;
  
  // Инфраструктура по умолчанию
  const infrastructure: ICity['infrastructure'] = params.infrastructure || {
    hasAirport: isHub || false,
    airportClass: isHub ? 'B' : undefined,
    hasTrainStation: false,
    hasBusStation: true,
    hasFerryPier: false,
    hasWinterRoad: false,
  };
  
  // Административная структура по умолчанию
  const administrative = params.administrative || createAdministrativeStructure(
    {
      type: 'republic',
      name: 'Республика Саха (Якутия)',
      shortName: 'Республика Саха (Якутия)',
      code: 'SAK',
    },
    {
      type: 'city',
      name: name,
      normalizedName: normalizedName,
    }
  );
  
  // Остановки по умолчанию (на основе инфраструктуры)
  const stops: IStop[] = params.stops || [];
  if (stops.length === 0) {
    if (infrastructure.hasAirport) {
      stops.push(
        new Stop(
          `${id}-airport`,
          `Аэропорт ${name}`,
          'airport',
          new Coordinates(coordinates.latitude + 0.01, coordinates.longitude + 0.01),
          id,
          isHub,
          hubLevel,
          infrastructure.airportClass ? 'TEST' : undefined
        )
      );
    }
    if (infrastructure.hasTrainStation) {
      stops.push(
        new Stop(
          `${id}-train-station`,
          `ЖД вокзал ${name}`,
          'train_station',
          new Coordinates(coordinates.latitude, coordinates.longitude),
          id,
          false
        )
      );
    }
    if (infrastructure.hasBusStation) {
      stops.push(
        new Stop(
          `${id}-bus-station`,
          `Автовокзал ${name}`,
          'bus_station',
          new Coordinates(coordinates.latitude, coordinates.longitude),
          id,
          false
        )
      );
    }
    if (infrastructure.hasFerryPier) {
      stops.push(
        new Stop(
          `${id}-ferry-pier`,
          `Пристань ${name}`,
          'ferry_pier',
          new Coordinates(coordinates.latitude, coordinates.longitude),
          id,
          false,
          undefined,
          undefined,
          undefined,
          `Пристань ${name}`
        )
      );
    }
  }
  
  const synonyms = params.synonyms || [];
  
  return new City(
    id,
    name,
    normalizedName,
    administrative,
    coordinates,
    timezone,
    isKeyCity,
    isHub,
    hubLevel,
    infrastructure,
    stops,
    synonyms,
    params.population
  );
}

/**
 * Создаёт федеральный хаб (Москва, Новосибирск и т.д.)
 */
export function generateFederalHub(params: Partial<CityFactoryParams> = {}): City {
  return generateMockCity({
    isHub: true,
    hubLevel: HubLevel.FEDERAL,
    infrastructure: {
      hasAirport: true,
      airportClass: 'A',
      hasTrainStation: true,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    ...params,
  });
}

/**
 * Создаёт региональный хаб Якутии (Якутск, Мирный и т.д.)
 */
export function generateRegionalHub(params: Partial<CityFactoryParams> = {}): City {
  return generateMockCity({
    isHub: true,
    hubLevel: HubLevel.REGIONAL,
    isKeyCity: true,
    infrastructure: {
      hasAirport: true,
      airportClass: 'B',
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: true,
      hasWinterRoad: true,
    },
    ...params,
  });
}

/**
 * Создаёт ключевой город Якутии (не хаб)
 */
export function generateKeyCity(params: Partial<CityFactoryParams> = {}): City {
  return generateMockCity({
    isKeyCity: true,
    isHub: false,
    infrastructure: {
      hasAirport: true,
      airportClass: 'C',
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    ...params,
  });
}

/**
 * Создаёт локальный город Якутии
 */
export function generateLocalCity(params: Partial<CityFactoryParams> = {}): City {
  return generateMockCity({
    isKeyCity: false,
    isHub: false,
    infrastructure: {
      hasAirport: false,
      hasTrainStation: false,
      hasBusStation: true,
      hasFerryPier: false,
      hasWinterRoad: false,
    },
    ...params,
  });
}





