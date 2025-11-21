import { API_BASE_URL } from '../constants/api';

/**
 * Универсальная функция для выполнения API запросов
 * Используется с React Query в query functions
 * 
 * @template T - Тип ожидаемого ответа от API
 * @param endpoint - Endpoint для запроса (относительный путь от API_BASE_URL)
 * @param options - Опции для fetch запроса
 * @returns Promise с данными типа T
 * @throws Error при ошибке сети или API
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.code) {
            errorMessage = `${errorData.error.code}: ${errorMessage}`;
          }
        }
      } catch {
        // Если не удалось распарсить JSON, используем стандартное сообщение
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Проверяем, есть ли подключение к интернету
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Нет подключения к интернету. Проверьте ваше соединение.');
    }
    
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL.replace('/api/v1', '')}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Network error: ${String(error)}`);
  }
}


