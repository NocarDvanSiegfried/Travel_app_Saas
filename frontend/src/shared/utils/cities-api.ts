import { fetchApi } from './api';

export interface CitiesResponse {
  cities: string[];
  mode?: string;
  quality?: number;
  source?: string;
  loadedAt?: string;
}

let citiesCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Загрузить список городов из backend
 * Использует кеширование для уменьшения нагрузки на backend
 */
export async function fetchCities(): Promise<string[]> {
  const now = Date.now();
  
  // Проверяем кеш
  if (citiesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return citiesCache;
  }

  try {
    const response = await fetchApi<CitiesResponse>('/cities');
    citiesCache = response.cities || [];
    cacheTimestamp = now;
    return citiesCache;
  } catch (error) {
    console.error('Failed to fetch cities from backend:', error);
    
    // Fallback на статический список если backend недоступен
    const fallbackCities = [
      'Якутск',
      'Нерюнгри',
      'Мирный',
      'Удачный',
      'Алдан',
      'Олекминск',
      'Ленск',
      'Вилюйск',
      'Чурапча',
      'Амга',
    ];
    
    citiesCache = fallbackCities;
    cacheTimestamp = now;
    return fallbackCities;
  }
}

/**
 * Очистить кеш городов (например, после изменения данных)
 */
export function clearCitiesCache(): void {
  citiesCache = null;
  cacheTimestamp = 0;
}




