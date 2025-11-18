/**
 * Базовый URL для API запросов
 * 
 * В браузере (клиентская часть) используется внешний URL:
 * - Локальная разработка: http://localhost:5000
 * - Docker: значение из NEXT_PUBLIC_API_URL (должно быть http://localhost:5000 для браузера)
 * 
 * В серверной части (SSR) может использоваться внутренний Docker URL
 */
export const API_URL = 
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
    : (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000');

export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `${API_URL}/api/${API_VERSION}`;


