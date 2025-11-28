/**
 * Контроллер для работы со страховыми продуктами
 */

import type { Request, Response } from 'express';
import { InsuranceService } from '../../application/insurance/InsuranceService';
import { InsuranceProductRepository } from '../../application/insurance/InsuranceProductRepository';
import type { IRiskScore } from '../../domain/entities/RiskAssessment';

/**
 * @swagger
 * components:
 *   schemas:
 *     RiskScore:
 *       type: object
 *       required:
 *         - value
 *         - level
 *         - description
 *       properties:
 *         value:
 *           type: number
 *           minimum: 1
 *           maximum: 10
 *           description: Значение риска от 1 до 10
 *           example: 5
 *         level:
 *           type: string
 *           enum: [very_low, low, medium, high, very_high]
 *           description: Уровень риска
 *           example: medium
 *         description:
 *           type: string
 *           description: Текстовое описание риска
 *           example: Средний риск задержек
 *     InsuranceProduct:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный идентификатор продукта
 *         type:
 *           type: string
 *           enum: [baggage, family, travel, trip_cancellation, delay_coverage]
 *           description: Тип страхового продукта
 *         name:
 *           type: string
 *           description: Название продукта
 *         description:
 *           type: string
 *           description: Описание покрытия
 *         basePrice:
 *           type: integer
 *           description: Базовая цена в копейках
 *         minPrice:
 *           type: integer
 *           description: Минимальная цена в копейках
 *         maxPrice:
 *           type: integer
 *           description: Максимальная цена в копейках
 *         riskMultiplier:
 *           type: number
 *           description: Множитель риска для расчета цены
 *         minRiskLevel:
 *           type: string
 *           enum: [very_low, low, medium, high, very_high]
 *           description: Минимальный уровень риска для предложения
 *         isActive:
 *           type: boolean
 *           description: Активен ли продукт
 *         displayOrder:
 *           type: integer
 *           description: Порядок отображения
 *     InsuranceOffer:
 *       type: object
 *       properties:
 *         product:
 *           $ref: '#/components/schemas/InsuranceProduct'
 *         price:
 *           type: integer
 *           description: Рассчитанная цена в копейках
 *         riskScore:
 *           $ref: '#/components/schemas/RiskScore'
 *         isRecommended:
 *           type: boolean
 *           description: Рекомендуется ли продукт
 *         priority:
 *           type: integer
 *           description: Приоритет отображения
 */

// Создаем экземпляры сервисов (в production следует использовать DI)
const productRepository = new InsuranceProductRepository();
const insuranceService = new InsuranceService(productRepository);

/**
 * @swagger
 * /insurance/products:
 *   get:
 *     summary: Получить список доступных страховых продуктов
 *     description: Возвращает все активные страховые продукты
 *     tags: [Insurance]
 *     responses:
 *       200:
 *         description: Список страховых продуктов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InsuranceProduct'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getInsuranceProducts(req: Request, res: Response): Promise<void> {
  try {
    const products = await insuranceService.getAvailableProducts();
    
    res.json({
      success: true,
      products: products.map((product) => product.toJSON()),
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Ошибка при получении страховых продуктов';

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * @swagger
 * /insurance/offers/route:
 *   post:
 *     summary: Получить предложения страховых продуктов для маршрута
 *     description: Возвращает список страховых продуктов с рассчитанными ценами на основе риска маршрута
 *     tags: [Insurance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - riskScore
 *             properties:
 *               riskScore:
 *                 $ref: '#/components/schemas/RiskScore'
 *               autoRecommend:
 *                 type: boolean
 *                 default: true
 *                 description: Автоматически рекомендовать продукты при высоком риске
 *           example:
 *             riskScore:
 *               value: 7
 *               level: high
 *               description: Высокий риск задержек и отмен
 *             autoRecommend: true
 *     responses:
 *       200:
 *         description: Список предложений страховых продуктов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 offers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InsuranceOffer'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getOffersForRoute(req: Request, res: Response): Promise<void> {
  try {
    const { riskScore, autoRecommend = true } = req.body;

    if (!riskScore) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'riskScore обязателен',
        },
      });
      return;
    }

    // Валидация riskScore
    if (typeof riskScore.value !== 'number' || riskScore.value < 1 || riskScore.value > 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'riskScore.value должен быть числом от 1 до 10',
        },
      });
      return;
    }

    const offers = await insuranceService.getOffersForRoute(
      riskScore as IRiskScore,
      autoRecommend
    );

    res.json({
      success: true,
      offers: offers.map((offer) => offer.toJSON()),
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Ошибка при получении предложений страховых продуктов';

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * @swagger
 * /insurance/offers/segment:
 *   post:
 *     summary: Получить предложения страховых продуктов для сегмента
 *     description: Возвращает список страховых продуктов с рассчитанными ценами на основе риска сегмента
 *     tags: [Insurance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - riskScore
 *             properties:
 *               riskScore:
 *                 $ref: '#/components/schemas/RiskScore'
 *               autoRecommend:
 *                 type: boolean
 *                 default: true
 *                 description: Автоматически рекомендовать продукты при высоком риске
 *           example:
 *             riskScore:
 *               value: 8
 *               level: high
 *               description: Высокий риск задержек
 *             autoRecommend: true
 *     responses:
 *       200:
 *         description: Список предложений страховых продуктов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 offers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InsuranceOffer'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getOffersForSegment(req: Request, res: Response): Promise<void> {
  try {
    const { riskScore, autoRecommend = true } = req.body;

    if (!riskScore) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'riskScore обязателен',
        },
      });
      return;
    }

    // Валидация riskScore
    if (typeof riskScore.value !== 'number' || riskScore.value < 1 || riskScore.value > 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'riskScore.value должен быть числом от 1 до 10',
        },
      });
      return;
    }

    const offers = await insuranceService.getOffersForSegment(
      riskScore as IRiskScore,
      autoRecommend
    );

    res.json({
      success: true,
      offers: offers.map((offer) => offer.toJSON()),
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Ошибка при получении предложений страховых продуктов';

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * @swagger
 * /insurance/calculate:
 *   post:
 *     summary: Рассчитать цену страхового продукта
 *     description: Рассчитывает цену страхового продукта на основе риска
 *     tags: [Insurance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - riskScore
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID страхового продукта
 *               riskScore:
 *                 $ref: '#/components/schemas/RiskScore'
 *           example:
 *             productId: insurance-travel
 *             riskScore:
 *               value: 6
 *               level: medium
 *               description: Средний риск
 *     responses:
 *       200:
 *         description: Рассчитанная цена страхового продукта
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 price:
 *                   type: integer
 *                   description: Цена в копейках
 *                 productId:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Страховой продукт не найден
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function calculateInsurancePrice(req: Request, res: Response): Promise<void> {
  try {
    const { productId, riskScore } = req.body;

    if (!productId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'productId обязателен',
        },
      });
      return;
    }

    if (!riskScore) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'riskScore обязателен',
        },
      });
      return;
    }

    // Валидация riskScore
    if (typeof riskScore.value !== 'number' || riskScore.value < 1 || riskScore.value > 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'riskScore.value должен быть числом от 1 до 10',
        },
      });
      return;
    }

    const price = await insuranceService.calculatePrice(
      productId,
      riskScore as IRiskScore
    );

    if (price === null) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Страховой продукт не найден',
        },
      });
      return;
    }

    res.json({
      success: true,
      productId,
      price,
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Ошибка при расчете цены страхового продукта';

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    });
  }
}

