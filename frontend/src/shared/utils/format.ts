/**
 * Форматирует длительность в минутах в читаемый формат
 * @param minutes - Длительность в минутах
 * @returns Отформатированная строка (например, "2ч 30м" или "45м")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}ч ${mins}м`;
  }
  return `${mins}м`;
}

/**
 * Форматирует время из строки в формат ЧЧ:ММ
 * @param timeString - Строка с временем (ISO формат или просто время)
 * @returns Отформатированное время (например, "14:30")
 */
export function formatTime(timeString: string | undefined): string {
  if (!timeString) return '—';
  try {
    // Пытаемся распарсить как ISO дату
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    // Если не получилось, пытаемся извлечь время из строки
    const time = timeString.split('T')[1]?.split('.')[0] || timeString;
    return time.substring(0, 5);
  } catch {
    return timeString;
  }
}

/**
 * Форматирует дату в читаемый формат
 * @param dateString - Строка с датой
 * @param options - Опции форматирования (полный формат или короткий)
 * @returns Отформатированная дата
 */
export function formatDate(dateString: string, options?: { full?: boolean }): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    if (options?.full) {
      // Полный формат: "понедельник, 1 января 2024 г."
      return date.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    // Короткий формат: "1 января 2024 г."
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Форматирует цену в формат с разделителями тысяч
 * @param price - Цена в рублях
 * @returns Отформатированная цена (например, "15 000 ₽")
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₽`;
}

