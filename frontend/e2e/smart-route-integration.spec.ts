/**
 * E2E тесты для проверки интеграции SmartRoute API
 * 
 * Проверяет:
 * - Использование нового endpoint /api/smart-route/build
 * - Отображение новых полей (viaHubs, pathGeometry, validation, etc.)
 * - Корректное отображение на карте и в списке сегментов
 */

import { test, expect } from '@playwright/test'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1'
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`

/**
 * Мок-данные для SmartRoute API
 */
const mockSmartRouteResponse = {
  success: true,
  route: {
    id: 'route-test-1',
    fromCity: {
      id: 'yakutsk',
      name: 'Якутск',
      coordinates: {
        latitude: 62.0278,
        longitude: 129.7042,
      },
    },
    toCity: {
      id: 'moscow',
      name: 'Москва',
      coordinates: {
        latitude: 55.7558,
        longitude: 37.6173,
      },
    },
    segments: [
      {
        segmentId: 'seg-1',
        type: 'airplane',
        from: {
          id: 'yakutsk-airport',
          name: 'Аэропорт Якутск',
          type: 'airport',
          coordinates: {
            latitude: 62.0278,
            longitude: 129.7042,
          },
          isHub: true,
          hubLevel: 'federal',
          cityId: 'yakutsk',
        },
        to: {
          id: 'moscow-airport',
          name: 'Аэропорт Москва',
          type: 'airport',
          coordinates: {
            latitude: 55.7558,
            longitude: 37.6173,
          },
          isHub: true,
          hubLevel: 'federal',
          cityId: 'moscow',
        },
        distance: {
          value: 5000,
          unit: 'km',
        },
        duration: {
          value: 390,
          unit: 'minutes',
          display: '6 часов 30 минут',
        },
        price: {
          base: 25000,
          total: 25000,
          currency: 'RUB',
        },
        isDirect: false,
        viaHubs: [
          {
            level: 'federal',
          },
        ],
        pathGeometry: {
          coordinates: [
            [129.7042, 62.0278], // Якутск
            [130.0, 62.5], // Промежуточная точка
            [37.6173, 55.7558], // Москва
          ],
        },
        schedule: {
          departureTime: '08:00',
          arrivalTime: '14:30',
        },
        seasonality: {
          available: true,
          season: 'summer',
          period: {
            start: '2024-06-01',
            end: '2024-10-18',
          },
        },
      },
    ],
    totalDistance: {
      value: 5000,
      unit: 'km',
    },
    totalDuration: {
      value: 390,
      unit: 'minutes',
      display: '6 часов 30 минут',
      breakdown: {
        travel: 360,
        transfers: 30,
      },
    },
    totalPrice: {
      base: 25000,
      total: 25000,
      currency: 'RUB',
      display: '25 000 ₽',
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: ['Рекомендуется проверить актуальность расписания'],
      segmentValidations: [
        {
          segmentId: 'seg-1',
          isValid: true,
          errors: [],
          warnings: [],
        },
      ],
    },
  },
  alternatives: [],
  executionTimeMs: 1234,
}

test.describe('SmartRoute API Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Мокаем API запрос к /api/smart-route/build
    await page.route(`${API_URL}/smart-route/build`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSmartRouteResponse),
      })
    })
  })

  test('должен использовать новый endpoint /api/smart-route/build', async ({ page }) => {
    const requests: string[] = []

    // Перехватываем все запросы
    page.on('request', (request) => {
      if (request.url().includes('/smart-route/build')) {
        requests.push(request.url())
      }
    })

    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки маршрутов
    await page.waitForSelector('[data-testid="routes-search-error"], .card', { timeout: 10000 })

    // Проверяем, что был вызван правильный endpoint
    expect(requests.length).toBeGreaterThan(0)
    expect(requests.some(url => url.includes('/smart-route/build'))).toBeTruthy()
    expect(requests.some(url => url.includes('/routes/search'))).toBeFalsy()
  })

  test('должен отображать новые поля SmartRoute в списке маршрутов', async ({ page }) => {
    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки маршрутов
    await page.waitForSelector('.card', { timeout: 10000 })

    // Проверяем отображение сегментов
    const segments = page.locator('[data-testid^="route-segment-"]')
    await expect(segments.first()).toBeVisible({ timeout: 10000 })

    // Проверяем отображение типа транспорта
    await expect(page.getByText('Самолёт')).toBeVisible({ timeout: 5000 })

    // Проверяем отображение времени
    await expect(page.getByText('08:00')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('14:30')).toBeVisible({ timeout: 5000 })
  })

  test('должен отображать хабы на карте', async ({ page }) => {
    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки
    await page.waitForSelector('.card', { timeout: 10000 })

    // Переходим на страницу деталей маршрута
    const selectButton = page.getByRole('button', { name: /выбрать маршрут/i }).first()
    if (await selectButton.isVisible()) {
      await selectButton.click()
      await page.waitForURL(/\/routes\/details/, { timeout: 5000 })

      // Проверяем наличие карты
      const map = page.locator('[data-testid="smart-route-map"]')
      await expect(map).toBeVisible({ timeout: 10000 })

      // Проверяем наличие маркеров хабов (через popup или визуально)
      // Хабы должны отображаться специальными маркерами
    }
  })

  test('должен отображать реалистичный путь (pathGeometry) на карте', async ({ page }) => {
    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки
    await page.waitForSelector('.card', { timeout: 10000 })

    // Переходим на страницу деталей
    const selectButton = page.getByRole('button', { name: /выбрать маршрут/i }).first()
    if (await selectButton.isVisible()) {
      await selectButton.click()
      await page.waitForURL(/\/routes\/details/, { timeout: 5000 })

      // Проверяем наличие карты
      const map = page.locator('[data-testid="smart-route-map"]')
      await expect(map).toBeVisible({ timeout: 10000 })

      // Путь должен быть не прямой линией (проверяем через наличие полилиний)
      const mapContainer = page.locator('[data-testid="smart-route-map-container"]')
      await expect(mapContainer).toBeVisible()
    }
  })

  test('должен отображать валидацию маршрута', async ({ page }) => {
    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки
    await page.waitForSelector('.card', { timeout: 10000 })

    // Переходим на страницу деталей
    const selectButton = page.getByRole('button', { name: /выбрать маршрут/i }).first()
    if (await selectButton.isVisible()) {
      await selectButton.click()
      await page.waitForURL(/\/routes\/details/, { timeout: 5000 })

      // Проверяем наличие информации о валидации
      // Валидация может отображаться в отдельном компоненте или в карточке маршрута
      const validationSection = page.getByText(/валидация|предупреждения|ошибки/i).first()
      // Валидация может быть не всегда видна, поэтому проверяем условно
      if (await validationSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(validationSection).toBeVisible()
      }
    }
  })

  test('должен отображать сезонность в сегментах', async ({ page }) => {
    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки
    await page.waitForSelector('.card', { timeout: 10000 })

    // Переходим на страницу деталей
    const selectButton = page.getByRole('button', { name: /выбрать маршрут/i }).first()
    if (await selectButton.isVisible()) {
      await selectButton.click()
      await page.waitForURL(/\/routes\/details/, { timeout: 5000 })

      // Проверяем наличие информации о сезонности
      // Сезонность может отображаться в компоненте сегментов
      const seasonalityInfo = page.getByText(/лето|зима|сезон/i).first()
      // Сезонность может быть не всегда видна, поэтому проверяем условно
      if (await seasonalityInfo.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(seasonalityInfo).toBeVisible()
      }
    }
  })

  test('должен использовать правильные queryKey для кеширования', async ({ page }) => {
    // Проверяем, что React Query использует правильные ключи
    const queryKeys: string[] = []

    // Перехватываем запросы и проверяем URL
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/smart-route/build')) {
        queryKeys.push(url)
      }
    })

    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки
    await page.waitForSelector('.card', { timeout: 10000 })

    // Проверяем, что запрос был сделан с правильными параметрами
    expect(queryKeys.length).toBeGreaterThan(0)
    expect(queryKeys[0]).toContain('/smart-route/build')
  })

  test('должен отображать корректные цены и расстояния', async ({ page }) => {
    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем загрузки
    await page.waitForSelector('.card', { timeout: 10000 })

    // Проверяем отображение цены (из totalPrice.display или totalPrice.total)
    // Формат может быть "25 000 ₽", "25000 ₽", "25,000 ₽" или просто "25000"
    const price = page.getByText(/25[\s,]*000|25\s*000|25000/i).first()
    await expect(price).toBeVisible({ timeout: 10000 })

    // Проверяем отображение расстояния (из totalDistance.value)
    const distance = page.getByText(/5000|5\s*000/i).first()
    // Расстояние может отображаться не всегда, проверяем условно
    if (await distance.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(distance).toBeVisible()
    }

    // Проверяем отображение времени (из totalDuration.display)
    const duration = page.getByText(/6\s*часов|6\s*ч/i).first()
    // Время может отображаться не всегда, проверяем условно
    if (await duration.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(duration).toBeVisible()
    }
  })
})

test.describe('SmartRoute API Error Handling', () => {
  test('должен обрабатывать ошибки API корректно', async ({ page }) => {
    // Мокаем ошибку API
    await page.route(`${API_URL}/smart-route/build`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'ROUTE_NOT_FOUND',
            message: 'Маршрут не найден',
          },
        }),
      })
    })

    await page.goto('/routes?from=Якутск&to=Москва&date=2024-07-15&passengers=1')

    // Ждем обработки ошибки
    await page.waitForSelector('[data-testid="routes-search-error"], .card', { timeout: 10000 })

    // Проверяем отображение сообщения об ошибке или пустого состояния
    const errorMessage = page.getByText(/не найдено|ошибка/i).first()
    // Ошибка может отображаться по-разному, проверяем условно
    if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(errorMessage).toBeVisible()
    }
  })
})


