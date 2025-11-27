/**
 * Валидаторы для умных маршрутов
 */

import { z } from 'zod';

/**
 * Схема валидации body для POST /smart-routes/build
 */
const buildSmartRouteBodySchema = z.object({
  /**
   * ID города отправления или название города
   */
  from: z.string().min(1, 'Параметр "from" обязателен'),

  /**
   * ID города назначения или название города
   */
  to: z.string().min(1, 'Параметр "to" обязателен'),

  /**
   * Дата поездки (ISO 8601)
   */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты. Используйте YYYY-MM-DD')
    .refine(
      (date) => {
        const d = new Date(date);
        return !isNaN(d.getTime()) && d >= new Date('2020-01-01');
      },
      {
        message: 'Дата должна быть валидной и не ранее 2020-01-01',
      }
    ),

  /**
   * Предпочтительный тип транспорта (опционально)
   */
  preferredTransport: z
    .enum(['airplane', 'train', 'bus', 'ferry', 'winter_road', 'taxi'])
    .optional(),

  /**
   * Максимальное количество пересадок (опционально, по умолчанию 3)
   */
  maxTransfers: z
    .number()
    .int()
    .min(0, 'maxTransfers должен быть >= 0')
    .max(5, 'maxTransfers должен быть <= 5')
    .optional()
    .default(3),

  /**
   * Приоритет оптимизации (опционально, по умолчанию 'price')
   */
  priority: z.enum(['price', 'time', 'comfort']).optional().default('price'),
});

/**
 * ValidationOptions для POST /smart-routes/build
 */
export const buildSmartRouteSchema = {
  body: buildSmartRouteBodySchema,
};

/**
 * Тип для валидированного запроса
 */
export type BuildSmartRouteRequest = z.infer<typeof buildSmartRouteBodySchema>;

/**
 * Схема валидации query для GET /smart-routes/autocomplete
 */
const autocompleteQuerySchema = z.object({
  /**
   * Поисковый запрос (город, район или регион)
   */
  q: z.string().min(1, 'Поисковый запрос не может быть пустым'),

  /**
   * Максимальное количество результатов (опционально, по умолчанию 10)
   */
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined) return 10;
      if (typeof val === 'number') return val;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 10 : parsed;
    })
    .pipe(z.number().int().min(1).max(100)),
});

/**
 * ValidationOptions для GET /smart-routes/autocomplete
 */
export const autocompleteSchema = {
  query: autocompleteQuerySchema,
};

/**
 * Тип для валидированного запроса autocomplete
 */
export type AutocompleteRequest = z.infer<typeof autocompleteQuerySchema>;

/**
 * Схема валидации body для POST /smart-routes/reality-check
 */
const realityCheckBodySchema = z.object({
  /**
   * Умный маршрут для проверки
   */
  route: z.any(), // SmartRoute объект - используем any для гибкости
});

/**
 * ValidationOptions для POST /smart-routes/reality-check
 */
export const realityCheckSchema = {
  body: realityCheckBodySchema,
};

