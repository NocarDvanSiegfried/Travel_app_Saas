/**
 * Кэш названий остановок
 * Используется для преобразования stopId в stopName
 */

type StopNamesCache = Map<string, string>;

const cache: StopNamesCache = new Map();

/**
 * Получить название остановки по ID из кеша
 * 
 * @param stopId - ID остановки
 * @returns Название остановки или ID, если название не найдено в кеше
 */
export function getStopName(stopId: string): string {
  return cache.get(stopId) || stopId;
}

/**
 * Сохранить название остановки в кеш
 * 
 * @param stopId - ID остановки
 * @param stopName - Название остановки
 */
export function setStopName(stopId: string, stopName: string): void {
  cache.set(stopId, stopName);
}

/**
 * Массово сохранить названия остановок в кеш
 * 
 * @param entries - Массив объектов с ID и названиями остановок
 */
export function setStopNames(entries: Array<{ stopId: string; stopName: string }>): void {
  entries.forEach(({ stopId, stopName }) => {
    cache.set(stopId, stopName);
  });
}

/**
 * Очистить весь кеш названий остановок
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Получить размер кеша названий остановок
 * 
 * @returns Количество записей в кеше
 */
export function getCacheSize(): number {
  return cache.size;
}

