/**
 * Валидаторы для страховых продуктов
 */

import { z } from 'zod';
import { RiskLevel } from '../../domain/entities/RiskAssessment';

/**
 * Схема для riskScore
 */
const riskScoreSchema = z.object({
  value: z.number().min(1).max(10),
  level: z.nativeEnum(RiskLevel),
  description: z.string().optional(),
});

/**
 * Схема для запроса предложений страховых продуктов для маршрута
 */
export const routeInsuranceOffersSchema = z.object({
  riskScore: riskScoreSchema,
  autoRecommend: z.boolean().optional().default(true),
});

/**
 * Схема для запроса предложений страховых продуктов для сегмента
 */
export const segmentInsuranceOffersSchema = z.object({
  riskScore: riskScoreSchema,
  autoRecommend: z.boolean().optional().default(true),
});

/**
 * Схема для расчета цены страхового продукта
 */
export const calculateInsurancePriceSchema = z.object({
  productId: z.string().min(1, 'productId обязателен'),
  riskScore: riskScoreSchema,
});


