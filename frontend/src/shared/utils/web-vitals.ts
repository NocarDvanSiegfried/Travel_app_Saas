/**
 * Утилита для отслеживания Web Vitals метрик
 * Использует next/web-vitals для сбора метрик производительности
 */

import { logger } from './logger'

/**
 * Тип метрики Web Vitals
 */
interface WebVitalMetric {
  id: string
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  navigationType: string
}

/**
 * Обработчик метрик Web Vitals
 * Логирует метрики и отправляет их в аналитику (если настроена)
 * 
 * @param metric - Метрика производительности
 */
export function handleWebVital(metric: WebVitalMetric) {
  // Логируем метрику
  logger.info('Web Vital metric', {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
  })

  // Отправляем в аналитику (если настроена)
  // Пример для Google Analytics 4:
  if (typeof window !== 'undefined') {
    const windowWithGtag = window as Window & { gtag?: (event: string, name: string, options: Record<string, unknown>) => void }
    if (windowWithGtag.gtag) {
      windowWithGtag.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      })
    }
  }

  // Можно также отправить на собственный backend
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        rating: metric.rating,
        delta: metric.delta,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
        url: window.location.href,
      }),
      keepalive: true, // Отправка даже после закрытия страницы
    }).catch((error) => {
      logger.warn('Failed to send web vital to analytics', error)
    })
  }
}

