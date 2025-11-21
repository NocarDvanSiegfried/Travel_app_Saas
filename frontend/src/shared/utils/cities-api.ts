import { fetchApi } from './api';
import { CitiesResponseSchema, type CitiesResponse } from '@/shared/schemas/cities.schema';

/**
 * Загрузить список городов из backend
 * Кеширование управляется React Query через useCities hook
 * 
 * @returns Promise со списком городов
 */
export async function fetchCities(): Promise<string[]> {
  try {
    const response = await fetchApi<CitiesResponse>('/cities');
    
    // Валидация ответа через Zod
    const validatedResponse = CitiesResponseSchema.parse(response);
    
    return validatedResponse.cities || [];
  } catch (error) {
    // Fallback на статический список если backend недоступен или валидация не прошла
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
    
    return fallbackCities;
  }
}







