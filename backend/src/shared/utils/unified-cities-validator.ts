/**
 * Unified Cities Reference Validator
 * 
 * Validates the structure and content of unified cities reference data
 * using Zod schemas.
 * 
 * @module shared/utils
 */

import { z } from 'zod';

/**
 * Schema for a single city in the reference
 */
export const CitySchema = z.object({
  name: z.string().min(1, 'City name cannot be empty'),
  normalizedName: z.string().min(1, 'Normalized city name cannot be empty'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  isKeyCity: z.boolean().optional().default(false),
  description: z.string().optional(),
  region: z.string().optional(),
  isFederalCity: z.boolean().optional().default(false),
  airports: z.array(z.string()).optional(),
});

/**
 * Schema for Yakutia cities reference
 */
export const YakutiaCitiesReferenceSchema = z.object({
  description: z.string().optional(),
  version: z.string().optional(),
  cities: z.array(CitySchema).min(1, 'At least one city must be present'),
});

/**
 * Schema for federal cities reference
 */
export const FederalCitiesReferenceSchema = z.object({
  description: z.string().optional(),
  version: z.string().optional(),
  cities: z.array(CitySchema).min(1, 'At least one city must be present'),
});

/**
 * Validates a single city
 * 
 * @param city - City object to validate
 * @returns Validation result
 */
export function validateCity(city: unknown): { success: boolean; error?: string } {
  try {
    CitySchema.parse(city);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    }
    return { success: false, error: String(error) };
  }
}

/**
 * Validates Yakutia cities reference
 * 
 * @param reference - Reference object to validate
 * @returns Validation result
 */
export function validateYakutiaCitiesReference(reference: unknown): { success: boolean; error?: string } {
  try {
    YakutiaCitiesReferenceSchema.parse(reference);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    }
    return { success: false, error: String(error) };
  }
}

/**
 * Validates federal cities reference
 * 
 * @param reference - Reference object to validate
 * @returns Validation result
 */
export function validateFederalCitiesReference(reference: unknown): { success: boolean; error?: string } {
  try {
    FederalCitiesReferenceSchema.parse(reference);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    }
    return { success: false, error: String(error) };
  }
}

/**
 * Checks for duplicate cities in a reference
 * 
 * @param cities - Array of cities to check
 * @returns Array of duplicate city names (normalized)
 */
export function findDuplicateCities(cities: Array<{ name: string; normalizedName?: string }>): string[] {
  const normalizedNames = new Map<string, string[]>();
  
  for (const city of cities) {
    const normalized = city.normalizedName || city.name.toLowerCase().trim();
    if (!normalizedNames.has(normalized)) {
      normalizedNames.set(normalized, []);
    }
    normalizedNames.get(normalized)!.push(city.name);
  }
  
  const duplicates: string[] = [];
  for (const [normalized, originalNames] of normalizedNames.entries()) {
    if (originalNames.length > 1) {
      duplicates.push(`${normalized} (${originalNames.join(', ')})`);
    }
  }
  
  return duplicates;
}



