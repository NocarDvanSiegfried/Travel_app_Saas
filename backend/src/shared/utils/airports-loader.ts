/**
 * Airports Loader
 * 
 * Loads and provides access to the airports reference directory.
 * Used for normalizing airport names to their corresponding cities.
 * 
 * @module shared/utils
 */

import fs from 'fs';
import path from 'path';

/**
 * Airport information from reference directory
 */
type AirportReference = {
  name: string;
  city: string;
  aliases: string[];
  normalizedName: string;
};

/**
 * Airports reference structure
 */
type AirportsReference = {
  version: string;
  description: string;
  airports: AirportReference[];
};

/**
 * Cached airports reference map
 * Key: normalized airport name (or alias), Value: city name
 */
let airportsMapCache: Map<string, string> | null = null;

/**
 * Load airports reference from JSON file
 * 
 * @returns Map of airport name (normalized) to city name
 */
export function loadAirportsReference(): Map<string, string> {
  if (airportsMapCache !== null) {
    return airportsMapCache;
  }

  const airportsMap = new Map<string, string>();

  try {
    const referencePath = path.join(
      __dirname,
      '../../../data/reference/airports-reference.json'
    );

    if (!fs.existsSync(referencePath)) {
      console.warn('[AirportsLoader] Reference file not found:', referencePath);
      return airportsMap;
    }

    const fileContent = fs.readFileSync(referencePath, 'utf-8');
    const reference: AirportsReference = JSON.parse(fileContent);

    for (const airport of reference.airports) {
      const normalizedAirportName = airport.normalizedName.toLowerCase().trim();
      const normalizedCity = airport.city.toLowerCase().trim();

      airportsMap.set(normalizedAirportName, airport.city);

      for (const alias of airport.aliases) {
        const normalizedAlias = alias.toLowerCase().trim();
        airportsMap.set(normalizedAlias, airport.city);
      }
    }

    airportsMapCache = airportsMap;
    console.log(`[AirportsLoader] Loaded ${reference.airports.length} airports from reference`);
  } catch (error: any) {
    console.error('[AirportsLoader] Error loading airports reference:', error?.message || String(error));
  }

  return airportsMap;
}

/**
 * Get city name by airport name
 * 
 * @param airportName - Airport name (can be in any case, with spaces)
 * @returns City name if airport found, undefined otherwise
 * 
 * @example
 * getCityByAirportName("Туймаада") => "Якутск"
 * getCityByAirportName("SVO") => "Москва"
 * getCityByAirportName("unknown") => undefined
 */
export function getCityByAirportName(airportName: string): string | undefined {
  if (!airportName) {
    return undefined;
  }

  const airportsMap = loadAirportsReference();
  const normalizedAirportName = airportName.toLowerCase().trim();

  return airportsMap.get(normalizedAirportName);
}










