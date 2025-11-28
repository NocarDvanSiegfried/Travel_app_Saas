/**
 * Suburbs Loader
 * 
 * Loads and provides access to the suburbs reference directory.
 * Used for normalizing suburb names to their main cities.
 * 
 * @module shared/utils
 */

import fs from 'fs';
import path from 'path';

/**
 * Suburb information from reference directory
 */
type SuburbReference = {
  name: string;
  mainCity: string;
  type: string;
  normalizedName: string;
  aliases?: string[];
};

/**
 * Suburbs reference structure
 */
type SuburbsReference = {
  version: string;
  description: string;
  suburbs: SuburbReference[];
};

/**
 * Cached suburbs reference map
 * Key: normalized suburb name (or alias), Value: main city name
 */
let suburbsMapCache: Map<string, string> | null = null;

/**
 * Load suburbs reference from JSON file
 * 
 * @returns Map of suburb name (normalized) to main city name
 */
export function loadSuburbsReference(): Map<string, string> {
  if (suburbsMapCache !== null) {
    return suburbsMapCache;
  }

  const suburbsMap = new Map<string, string>();

  try {
    const referencePath = path.join(
      __dirname,
      '../../../data/reference/suburbs-reference.json'
    );

    if (!fs.existsSync(referencePath)) {
      console.warn('[SuburbsLoader] Reference file not found:', referencePath);
      return suburbsMap;
    }

    const fileContent = fs.readFileSync(referencePath, 'utf-8');
    const reference: SuburbsReference = JSON.parse(fileContent);

    for (const suburb of reference.suburbs) {
      const normalizedSuburbName = suburb.normalizedName.toLowerCase().trim();
      const mainCity = suburb.mainCity;

      suburbsMap.set(normalizedSuburbName, mainCity);

      if (suburb.aliases) {
        for (const alias of suburb.aliases) {
          const normalizedAlias = alias.toLowerCase().trim();
          suburbsMap.set(normalizedAlias, mainCity);
        }
      }
    }

    suburbsMapCache = suburbsMap;
    console.log(`[SuburbsLoader] Loaded ${reference.suburbs.length} suburbs from reference`);
  } catch (error: any) {
    console.error('[SuburbsLoader] Error loading suburbs reference:', error?.message || String(error));
  }

  return suburbsMap;
}

/**
 * Get main city name by suburb name
 * 
 * @param suburbName - Suburb name (can be in any case, with spaces)
 * @returns Main city name if suburb found, undefined otherwise
 * 
 * @example
 * getMainCityBySuburb("Нижний Бестях") => "Якутск"
 * getMainCityBySuburb("Беркакит") => "Нерюнгри"
 * getMainCityBySuburb("unknown") => undefined
 */
export function getMainCityBySuburb(suburbName: string): string | undefined {
  if (!suburbName) {
    return undefined;
  }

  const suburbsMap = loadSuburbsReference();
  const normalizedSuburbName = suburbName.toLowerCase().trim();

  return suburbsMap.get(normalizedSuburbName);
}












