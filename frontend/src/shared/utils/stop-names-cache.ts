/**
 * Кэш названий остановок
 * Используется для преобразования stopId в stopName
 */

type StopNamesCache = Map<string, string>;

let cache: StopNamesCache = new Map();

export function getStopName(stopId: string): string {
  return cache.get(stopId) || stopId;
}

export function setStopName(stopId: string, stopName: string): void {
  cache.set(stopId, stopName);
}

export function setStopNames(entries: Array<{ stopId: string; stopName: string }>): void {
  entries.forEach(({ stopId, stopName }) => {
    cache.set(stopId, stopName);
  });
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}

