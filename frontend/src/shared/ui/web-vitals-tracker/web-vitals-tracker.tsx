'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { handleWebVital } from '@/shared/utils/web-vitals'

/**
 * Компонент для инициализации отслеживания Web Vitals
 * 
 * Автоматически запускает сбор метрик производительности при монтировании компонента.
 * Метрики логируются и отправляются в аналитику (если настроена).
 * 
 * @returns null (не рендерит ничего)
 */
export function WebVitalsTracker() {
  useReportWebVitals(handleWebVital)

  return null
}

