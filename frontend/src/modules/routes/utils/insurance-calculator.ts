/**
 * Утилиты для работы со страховыми продуктами
 */

import type { IInsuranceProduct, IRiskScore } from '../domain/types';

/**
 * Рассчитывает цену страхового продукта на основе риска
 * 
 * Формула: basePrice * (1 + (riskScore.value - 1) * riskMultiplier)
 * 
 * @param product - Страховой продукт
 * @param riskScore - Оценка риска
 * @returns Цена в копейках
 */
export function calculateInsurancePrice(
  product: IInsuranceProduct,
  riskScore: IRiskScore
): number {
  const riskValue = Math.max(1, Math.min(10, riskScore.value));
  const calculatedPrice = Math.round(
    product.basePrice * (1 + (riskValue - 1) * product.riskMultiplier)
  );
  
  // Ограничиваем минимальной и максимальной ценой
  return Math.max(product.minPrice, Math.min(product.maxPrice, calculatedPrice));
}

/**
 * Форматирует цену страховки из копеек в рубли
 * 
 * @param priceInKopecks - Цена в копейках
 * @returns Отформатированная цена в рублях
 */
export function formatInsurancePrice(priceInKopecks: number): string {
  const rubles = priceInKopecks / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

/**
 * Получает название типа страхового продукта на русском языке
 */
export function getInsuranceProductTypeLabel(type: string): string {
  switch (type) {
    case 'baggage':
      return 'Страхование багажа';
    case 'family':
      return 'Страхование всей семьи';
    case 'travel':
      return 'Страхование поездки';
    case 'trip_cancellation':
      return 'Страхование отмены поездки';
    case 'delay_coverage':
      return 'Страхование задержки рейса';
    default:
      return 'Страхование';
  }
}

/**
 * Получает иконку для типа страхового продукта
 */
export function getInsuranceProductIcon(type: string): string {
  switch (type) {
    case 'baggage':
      return '🎒';
    case 'family':
      return '👨‍👩‍👧‍👦';
    case 'travel':
      return '✈️';
    case 'trip_cancellation':
      return '❌';
    case 'delay_coverage':
      return '⏰';
    default:
      return '🛡️';
  }
}


