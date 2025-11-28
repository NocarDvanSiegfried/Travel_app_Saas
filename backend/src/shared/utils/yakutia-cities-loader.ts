/**
 * Yakutia Cities Loader
 * 
 * Loads and provides access to the Yakutia cities reference directory.
 * This is the single source of truth for Yakutia cities in demo mode.
 * 
 * @module shared/utils
 */

import fs from 'fs';
import path from 'path';
import { normalizeCityName } from './city-normalizer';

/**
 * City information from reference directory
 */
export type YakutiaCity = {
  name: string;
  normalizedName: string;
  latitude: number;
  longitude: number;
  isKeyCity: boolean;
  description?: string;
};

/**
 * Yakutia cities reference structure
 */
type YakutiaCitiesReference = {
  description: string;
  version: string;
  cities: Array<{
    name: string;
    normalizedName: string;
    latitude: number;
    longitude: number;
    isKeyCity: boolean;
    description?: string;
  }>;
  notes?: string[];
};

/**
 * Load Yakutia cities reference from JSON file
 * 
 * @returns Map of city name (normalized) to city info
 */
export function loadYakutiaCitiesReference(): Map<string, YakutiaCity> {
  const citiesMap = new Map<string, YakutiaCity>();

  try {
    const referencePath = path.join(
      __dirname,
      '../../../data/mock/yakutia-cities-reference.json'
    );

    if (!fs.existsSync(referencePath)) {
      console.warn(
        `[YakutiaCitiesLoader] Reference file not found: ${referencePath}. Using empty map.`
      );
      return citiesMap;
    }

    const fileContent = fs.readFileSync(referencePath, 'utf-8');
    const reference: YakutiaCitiesReference = JSON.parse(fileContent);

    for (const city of reference.cities) {
      // Use normalizedName as key for consistent lookups
      const normalizedKey = normalizeCityName(city.normalizedName || city.name);
      citiesMap.set(normalizedKey, {
        name: city.name,
        normalizedName: city.normalizedName || normalizeCityName(city.name),
        latitude: city.latitude,
        longitude: city.longitude,
        isKeyCity: city.isKeyCity ?? false,
        description: city.description,
      });
    }

    console.log(
      `[YakutiaCitiesLoader] Loaded ${citiesMap.size} cities from reference`
    );
  } catch (error: any) {
    console.error(
      `[YakutiaCitiesLoader] Error loading cities reference: ${error?.message || String(error)}`
    );
  }

  return citiesMap;
}

/**
 * Get all Yakutia cities from reference
 * 
 * @returns Array of all cities
 */
export function getAllYakutiaCities(): YakutiaCity[] {
  const citiesMap = loadYakutiaCitiesReference();
  return Array.from(citiesMap.values());
}

/**
 * Get city by normalized name
 * 
 * @param cityName - City name (will be normalized)
 * @returns City info or undefined
 */
export function getYakutiaCity(cityName: string): YakutiaCity | undefined {
  const citiesMap = loadYakutiaCitiesReference();
  const normalized = normalizeCityName(cityName);
  return citiesMap.get(normalized);
}

/**
 * Check if city is in Yakutia reference
 * 
 * @param cityName - City name (will be normalized)
 * @returns True if city is in reference
 */
export function isYakutiaCity(cityName: string): boolean {
  return getYakutiaCity(cityName) !== undefined;
}

/**
 * Get cities directory in format expected by VirtualEntitiesGeneratorWorker
 * 
 * @returns Record of city name to coordinates
 */
export function getYakutiaCitiesDirectory(): Record<
  string,
  { latitude: number; longitude: number }
> {
  const cities = getAllYakutiaCities();
  const directory: Record<string, { latitude: number; longitude: number }> = {};

  for (const city of cities) {
    directory[city.name] = {
      latitude: city.latitude,
      longitude: city.longitude,
    };
  }

  return directory;
}















