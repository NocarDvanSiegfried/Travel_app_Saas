import { fetchApi } from './api';
import { CitiesResponseSchema, type CitiesResponse, type City } from '@/shared/schemas/cities.schema';

/**
 * Загрузить список городов из backend
 * Кеширование управляется React Query через useCities hook
 * 
 * @returns Promise со списком городов (объекты с id и name)
 */
export async function fetchCities(): Promise<City[]> {
  try {
    const response = await fetchApi<CitiesResponse>('/cities');
    
    // Валидация ответа через Zod
    const validatedResponse = CitiesResponseSchema.parse(response);
    
    return validatedResponse.data || [];
  } catch (error) {
    // ФАЗА 4 ФИКС: Fallback на статический список если backend недоступен или валидация не прошла
    // Fallback список городов с ID (синхронизирован с unified reference и ALL_CITIES)
    // Включает все города из unified reference: федеральные города, города Якутии, железнодорожные вокзалы
    const fallbackCities: City[] = [
      // Федеральные города (крупные транспортные узлы)
      { id: 'moscow', name: 'Москва' },
      { id: 'saint-petersburg', name: 'Санкт-Петербург' },
      { id: 'novosibirsk', name: 'Новосибирск' },
      { id: 'krasnoyarsk', name: 'Красноярск' },
      { id: 'khabarovsk', name: 'Хабаровск' },
      { id: 'irkutsk', name: 'Иркутск' },
      { id: 'vladivostok', name: 'Владивосток' },
      // Региональные хабы Якутии
      { id: 'yakutsk', name: 'Якутск' },
      { id: 'mirny', name: 'Мирный' },
      { id: 'neryungri', name: 'Нерюнгри' },
      // Ключевые города Якутии
      { id: 'lensk', name: 'Ленск' },
      { id: 'vilyuysk', name: 'Вилюйск' },
      { id: 'olekminsk', name: 'Олёкминск' },
      { id: 'tiksi', name: 'Тикси' },
      { id: 'aldan', name: 'Алдан' },
      { id: 'khandyga', name: 'Хандыга' },
      { id: 'pokrovsk', name: 'Покровск' },
      { id: 'udachny', name: 'Удачный' },
      { id: 'verkhoyansk', name: 'Верхоянск' },
      { id: 'zhigansk', name: 'Жиганск' },
      { id: 'srednekolymsk', name: 'Среднеколымск' },
      { id: 'chokurdakh', name: 'Чокурдах' },
      // Дополнительные города Якутии
      { id: 'tynda', name: 'Тында' },
      { id: 'skovorodino', name: 'Сковородино' },
      { id: 'tommot', name: 'Томмот' },
      { id: 'nizhny-bestyakh', name: 'Нижний Бестях' },
      // Города из unified reference (yakutia-cities-reference.json)
      { id: 'amga', name: 'Амга' },
      { id: 'bestyakh', name: 'Бестях' },
      { id: 'ust-kut', name: 'Усть-Кут' },
      { id: 'ust-nera', name: 'Усть-Нера' },
      { id: 'sangar', name: 'Сангар' },
      { id: 'suntar', name: 'Сунтар' },
      { id: 'nyurba', name: 'Нюрба' },
      { id: 'namtsy', name: 'Намцы' },
      { id: 'magan', name: 'Маган' },
      // Железнодорожные вокзалы из russia-federal-cities-reference.json
      { id: 'novosibirsk-glavny', name: 'Новосибирск-Главный' },
      { id: 'krasnoyarsk-passazhirsky', name: 'Красноярск-Пассажирский' },
      { id: 'irkutsk-passazhirsky', name: 'Иркутск-Пассажирский' },
      { id: 'khabarovsk-passazhirsky', name: 'Хабаровск-Пассажирский' },
      { id: 'vladivostok-passazhirsky', name: 'Владивосток-Пассажирский' },
    ];
    
    // ФАЗА 4 ФИКС: Логируем использование fallback для диагностики
    console.warn('[cities-api] Using fallback cities list', {
      fallbackCitiesCount: fallbackCities.length,
      error: error instanceof Error ? error.message : String(error),
    });
    
    return fallbackCities;
  }
}







