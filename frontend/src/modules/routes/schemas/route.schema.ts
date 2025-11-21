import { z } from 'zod'

/**
 * Схема валидации параметров поиска маршрутов
 */
export const RouteSearchParamsSchema = z.object({
  /**
   * Город отправления (обязательное поле)
   */
  from: z
    .string()
    .min(1, 'Город отправления обязателен')
    .trim()
    .refine((val) => val.length > 0, {
      message: 'Город отправления не может быть пустым',
    }),

  /**
   * Город назначения (обязательное поле)
   */
  to: z
    .string()
    .min(1, 'Город назначения обязателен')
    .trim()
    .refine((val) => val.length > 0, {
      message: 'Город назначения не может быть пустым',
    }),

  /**
   * Дата поездки (опциональное поле)
   * Формат: YYYY-MM-DD
   */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты. Используйте формат YYYY-MM-DD')
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const date = new Date(val)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date >= today
      },
      {
        message: 'Дата не может быть в прошлом',
      }
    ),

  /**
   * Количество пассажиров (опциональное поле)
   * Должно быть от 1 до 9
   */
  passengers: z
    .string()
    .regex(/^[1-9]$/, 'Количество пассажиров должно быть от 1 до 9')
    .optional()
    .transform((val) => (val === '1' ? undefined : val)), // Убираем '1' так как это значение по умолчанию
})

/**
 * Схема валидации с проверкой, что города отличаются
 */
export const RouteSearchParamsWithValidationSchema = RouteSearchParamsSchema.refine(
  (data) => data.from !== data.to,
  {
    message: 'Город назначения должен отличаться от города отправления',
    path: ['to'], // Ошибка привязывается к полю 'to'
  }
)

/**
 * Тип для параметров поиска маршрутов (выведенный из схемы)
 */
export type RouteSearchParams = z.infer<typeof RouteSearchParamsSchema>

/**
 * Тип для валидированных параметров поиска маршрутов
 */
export type ValidatedRouteSearchParams = z.infer<typeof RouteSearchParamsWithValidationSchema>

