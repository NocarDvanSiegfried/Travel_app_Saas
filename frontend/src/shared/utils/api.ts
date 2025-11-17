import { API_BASE_URL } from '../constants/api';

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
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new Error(`Не удалось подключиться к серверу. Проверьте, что backend запущен на ${API_BASE_URL}`);
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Network error: ${String(error)}`);
  }
}


