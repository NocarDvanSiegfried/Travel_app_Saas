import { z } from 'zod'

/**
 * Схема валидации ответа API для списка городов
 */
export const CitiesResponseSchema = z.object({
  /**
   * Список городов
   */
  cities: z.array(z.string().min(1, 'Название города не может быть пустым')),

  /**
   * Режим данных (опционально)
   */
  mode: z.string().optional(),

  /**
   * Качество данных (опционально)
   */
  quality: z.number().min(0).max(1).optional(),

  /**
   * Источник данных (опционально)
   */
  source: z.string().optional(),

  /**
   * Время загрузки (опционально)
   */
  loadedAt: z.string().optional(),
})

/**
 * Тип для ответа API списка городов (выведенный из схемы)
 */
export type CitiesResponse = z.infer<typeof CitiesResponseSchema>

/**
 * Схема валидации для одного города
 */
export const CitySchema = z
  .string()
  .min(1, 'Название города не может быть пустым')
  .trim()
  .refine((val) => val.length > 0, {
    message: 'Название города не может быть пустым',
  })

/**
 * Тип для города (выведенный из схемы)
 */
export type City = z.infer<typeof CitySchema>

