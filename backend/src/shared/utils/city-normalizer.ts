/**
 * Утилита для нормализации названий городов
 * 
 * Обеспечивает единообразную обработку названий городов:
 * - Удаление префиксов ("г.", "город")
 * - Удаление лишних пробелов
 * - Приведение к нижнему регистру
 * - Нормализация специальных символов
 */

/**
 * Нормализовать название города
 * 
 * @param cityName - Название города (может содержать "г. ", пробелы, разные регистры)
 * @returns Нормализованное название (lowercase, без префиксов, без лишних пробелов)
 * 
 * @example
 * normalizeCityName("г. Якутск") => "якутск"
 * normalizeCityName("  ЯКУТСК  ") => "якутск"
 * normalizeCityName("город Нерюнгри") => "нерюнгри"
 */
export function normalizeCityName(cityName: string): string {
  if (!cityName) {
    return '';
  }

  // Убираем префиксы типа "г.", "город", "г "
  let normalized = cityName
    .replace(/^(г\.|город|г\s+)/i, '')
    .trim();

  // Убираем лишние пробелы
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Приводим к нижнему регистру
  normalized = normalized.toLowerCase();

  // Нормализуем специальные символы (ё -> е, убираем дефисы в некоторых случаях)
  normalized = normalized
    .replace(/ё/g, 'е')
    .replace(/ъ/g, '')
    .replace(/ь/g, '');

  return normalized;
}

/**
 * Найти город в справочнике по нормализованному названию
 * 
 * @param normalizedCityName - Нормализованное название города
 * @param citiesMap - Справочник городов (ключ - название, значение - координаты)
 * @returns Оригинальное название города из справочника или null
 * 
 * @example
 * findCityInDirectory("якутск", YAKUTIA_CITIES_COORDINATES) => "Якутск"
 * findCityInDirectory("нерюнгри", YAKUTIA_CITIES_COORDINATES) => "Нерюнгри"
 */
export function findCityInDirectory(
  normalizedCityName: string,
  citiesMap: Record<string, { latitude: number; longitude: number }>
): string | null {
  if (!normalizedCityName) {
    return null;
  }

  // Прямое совпадение
  for (const [cityName, _] of Object.entries(citiesMap)) {
    if (normalizeCityName(cityName) === normalizedCityName) {
      return cityName;
    }
  }

  // Частичное совпадение (если запрос содержит название города)
  for (const [cityName, _] of Object.entries(citiesMap)) {
    const normalizedMapCity = normalizeCityName(cityName);
    if (
      normalizedMapCity.includes(normalizedCityName) ||
      normalizedCityName.includes(normalizedMapCity)
    ) {
      return cityName;
    }
  }

  return null;
}

/**
 * Проверить, является ли строка названием города из справочника
 * 
 * @param cityName - Название города
 * @param citiesMap - Справочник городов
 * @returns true, если город найден в справочнике
 */
export function isCityInDirectory(
  cityName: string,
  citiesMap: Record<string, { latitude: number; longitude: number }>
): boolean {
  const normalized = normalizeCityName(cityName);
  return findCityInDirectory(normalized, citiesMap) !== null;
}

/**
 * Извлечь название города из названия остановки
 * 
 * Единая логика для всех мест системы:
 * - Всегда берется последнее слово из названия остановки
 * - Работает для любых форматов: "Аэропорт Якутск", "Автостанция Центральная Якутск", "Вокзал Санкт-Петербург Московский"
 * 
 * @param stopName - Название остановки (может содержать префиксы типа "Аэропорт", "Автостанция", "Вокзал")
 * @param address - Опциональный адрес (используется как fallback)
 * @returns Название города (оригинальное, без нормализации)
 * 
 * @example
 * extractCityFromStopName("Аэропорт Якутск (Туймаада)") => "Туймаада" (последнее слово в скобках)
 * extractCityFromStopName("Автостанция Центральная Якутск") => "Якутск" (последнее слово, не прилагательное)
 * extractCityFromStopName("Автостанция Олёкминск") => "Олёкминск" (последнее слово, не тип остановки)
 * extractCityFromStopName("Вокзал Санкт-Петербург Московский") => "Московский" (последнее слово)
 * extractCityFromStopName("Остановка Беркакит") => "Беркакит" (последнее слово, не тип остановки)
 * extractCityFromStopName("Якутск Аэропорт") => "Якутск" (первое слово, последнее - тип остановки)
 */
export function extractCityFromStopName(stopName?: string, address?: string): string {
  // Priority 1: Extract from stop name
  if (stopName) {
    // Remove common prefixes and patterns
    // Examples: "Аэропорт Якутск", "Автостанция Олёкминск", "Вокзал Санкт-Петербург Московский"
    
    // First, try to extract city from patterns like "г. CityName"
    const cityMatch = stopName.match(/г\.\s*([А-Яа-яЁё\-\s]+)/i);
    if (cityMatch) {
      return cityMatch[1].trim();
    }
    
    // Extract all Cyrillic words (including hyphenated names like "Санкт-Петербург")
    const words = stopName.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g);
    if (words && words.length > 0) {
      // Common stop type words that should be skipped
      const stopTypeWords = new Set([
        'аэропорт', 'вокзал', 'автостанция', 'автовокзал', 'остановка', 'станция',
        'центральная', 'главный', 'пассажирский'
      ]);
      
      // Try to find city name (usually the last significant word, not a stop type)
      // For "Аэропорт Якутск" -> "Якутск" (last word, not a stop type)
      // For "Якутск Аэропорт" -> "Якутск" (first word, last is stop type)
      // For "Автостанция Центральная Якутск" -> "Якутск" (last word, middle is adjective)
      
      // Strategy: take the last word if it's not a stop type, otherwise take the first word
      const lastWord = words[words.length - 1].toLowerCase();
      if (!stopTypeWords.has(lastWord) && words.length > 1) {
        // Last word is not a stop type, likely the city name
        return words[words.length - 1];
      } else if (words.length > 1) {
        // Last word is a stop type, take the first word (likely the city)
        return words[0];
      } else {
        // Only one word, return it
        return words[0];
      }
    }
    
    // Fallback: if no Cyrillic words found, try splitting by comma
    const parts = stopName.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    
    // Last resort: return trimmed name
    return stopName.trim();
  }
  
  // Priority 2: Extract from address
  if (address) {
    const addressParts = address.split(',');
    if (addressParts.length > 0) {
      return addressParts[addressParts.length - 1].trim();
    }
  }
  
  return '';
}

/**
 * Генерировать стабильный ID для виртуальной остановки на основе названия города
 * 
 * ID всегда одинаковый для одного и того же города, независимо от времени создания
 * 
 * @param cityName - Название города (оригинальное из справочника)
 * @returns Стабильный ID виртуальной остановки
 * 
 * @example
 * generateVirtualStopId("Якутск") => "virtual-stop-yakutsk"
 * generateVirtualStopId("Олёкминск") => "virtual-stop-olekminsk"
 */
export function generateVirtualStopId(cityName: string): string {
  // Нормализуем название города для создания стабильного ID
  const normalized = normalizeCityName(cityName);
  
  // Убираем все не-буквенные символы и заменяем пробелы на дефисы
  const stableId = normalized
    .replace(/[^а-яёa-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `virtual-stop-${stableId}`;
}

/**
 * Генерировать стабильный ID для виртуального маршрута на основе stopId остановок
 * 
 * ID всегда одинаковый для одной и той же пары остановок, независимо от времени создания
 * 
 * @param fromStopId - ID остановки отправления
 * @param toStopId - ID остановки назначения
 * @returns Стабильный ID виртуального маршрута
 * 
 * @example
 * generateVirtualRouteId("virtual-stop-yakutsk", "virtual-stop-olekminsk") => "virtual-route-virtual-stop-yakutsk-virtual-stop-olekminsk"
 */
export function generateVirtualRouteId(fromStopId: string, toStopId: string): string {
  // Сортируем stopId для обеспечения стабильности (A→B и B→A могут иметь разные маршруты)
  // Но для виртуальных маршрутов обычно нужны оба направления
  return `virtual-route-${fromStopId}-${toStopId}`;
}

