/**
 * Unified Cities Loader
 * 
 * Loads and provides access to the unified cities reference directory.
 * Combines Yakutia cities and Russia federal cities into a single reference.
 * 
 * @module shared/utils
 */

import fs from 'fs';
import path from 'path';
import { normalizeCityName } from './city-normalizer';
import { getAllYakutiaCities, type YakutiaCity } from './yakutia-cities-loader';

/**
 * Unified city information
 */
export type UnifiedCity = {
  name: string;
  normalizedName: string;
  latitude: number;
  longitude: number;
  region?: string;
  isKeyCity: boolean;
  isFederalCity: boolean;
  airports?: string[];
  description?: string;
};

/**
 * Federal cities reference structure
 */
type FederalCitiesReference = {
  description: string;
  version: string;
  cities: Array<{
    name: string;
    normalizedName: string;
    latitude: number;
    longitude: number;
    region?: string;
    isKeyCity: boolean;
    isFederalCity: boolean;
    airports?: string[];
    description?: string;
  }>;
};

/**
 * Cache for loaded unified cities reference
 */
let unifiedCitiesCache: Map<string, UnifiedCity> | null = null;

/**
 * Load unified cities reference from JSON files
 * 
 * Combines Yakutia cities and Russia federal cities into a single Map.
 * 
 * @returns Map of normalized city name to unified city info
 */
export function loadUnifiedCitiesReference(): Map<string, UnifiedCity> {
  if (unifiedCitiesCache !== null) {
    return unifiedCitiesCache;
  }

  const citiesMap = new Map<string, UnifiedCity>();

  try {
    // Load Yakutia cities
    const yakutiaCities = getAllYakutiaCities();
    for (const city of yakutiaCities) {
      const normalizedKey = normalizeCityName(city.normalizedName || city.name);
      citiesMap.set(normalizedKey, {
        name: city.name,
        normalizedName: city.normalizedName || normalizeCityName(city.name),
        latitude: city.latitude,
        longitude: city.longitude,
        region: 'Республика Саха (Якутия)',
        isKeyCity: city.isKeyCity ?? false,
        isFederalCity: false,
        description: city.description,
      });
    }

    // Load federal cities
    const federalCitiesPath = path.join(
      __dirname,
      '../../../data/reference/russia-federal-cities-reference.json'
    );

    if (fs.existsSync(federalCitiesPath)) {
      const fileContent = fs.readFileSync(federalCitiesPath, 'utf-8');
      const reference: FederalCitiesReference = JSON.parse(fileContent);

      for (const city of reference.cities) {
        const normalizedKey = normalizeCityName(city.normalizedName || city.name);
        // Don't override if Yakutia city with same name exists
        if (!citiesMap.has(normalizedKey)) {
          citiesMap.set(normalizedKey, {
            name: city.name,
            normalizedName: city.normalizedName || normalizeCityName(city.name),
            latitude: city.latitude,
            longitude: city.longitude,
            region: city.region,
            isKeyCity: city.isKeyCity ?? false,
            isFederalCity: city.isFederalCity ?? true,
            airports: city.airports,
            description: city.description,
          });
        }
      }
    } else {
      console.warn(
        `[UnifiedCitiesLoader] Federal cities reference file not found: ${federalCitiesPath}. Using only Yakutia cities.`
      );
    }

    console.log(
      `[UnifiedCitiesLoader] Loaded ${citiesMap.size} cities from unified reference (${yakutiaCities.length} Yakutia, ${citiesMap.size - yakutiaCities.length} federal)`
    );
  } catch (error: any) {
    console.error(
      `[UnifiedCitiesLoader] Error loading unified cities reference: ${error?.message || String(error)}`
    );
  }

  unifiedCitiesCache = citiesMap;
  return citiesMap;
}

/**
 * Get unified city by name
 * 
 * @param cityName - City name (will be normalized)
 * @returns Unified city info or undefined
 */
export function getUnifiedCity(cityName: string): UnifiedCity | undefined {
  const citiesMap = loadUnifiedCitiesReference();
  const normalized = normalizeCityName(cityName);
  return citiesMap.get(normalized);
}

/**
 * Check if city is in unified reference
 * 
 * @param cityName - City name (will be normalized)
 * @returns True if city is in reference
 */
export function isCityInUnifiedReference(cityName: string): boolean {
  return getUnifiedCity(cityName) !== undefined;
}

/**
 * Get all federal cities from unified reference
 * 
 * @returns Array of all federal cities
 */
export function getAllFederalCities(): UnifiedCity[] {
  const citiesMap = loadUnifiedCitiesReference();
  return Array.from(citiesMap.values()).filter((city) => city.isFederalCity);
}

/**
 * Get all Yakutia cities from unified reference
 * 
 * @returns Array of all Yakutia cities
 */
export function getAllYakutiaCitiesUnified(): UnifiedCity[] {
  const citiesMap = loadUnifiedCitiesReference();
  return Array.from(citiesMap.values()).filter((city) => !city.isFederalCity);
}

/**
 * Get all cities from unified reference
 * 
 * @returns Array of all cities (Yakutia + federal)
 */
export function getAllUnifiedCities(): UnifiedCity[] {
  const citiesMap = loadUnifiedCitiesReference();
  return Array.from(citiesMap.values());
}

/**
 * Get cities directory in format expected by VirtualEntitiesGeneratorWorker
 * 
 * @returns Record of city name to coordinates
 */
export function getUnifiedCitiesDirectory(): Record<
  string,
  { latitude: number; longitude: number }
> {
  const cities = getAllUnifiedCities();
  const directory: Record<string, { latitude: number; longitude: number }> = {};

  for (const city of cities) {
    directory[city.name] = {
      latitude: city.latitude,
      longitude: city.longitude,
    };
  }

  return directory;
}



