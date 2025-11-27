import { test, expect } from '@playwright/test'

test.describe('Routes Search', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу перед каждым тестом
    await page.goto('/')
  })

  test('should search for routes with valid data', async ({ page }) => {
    // Мокируем API ответ для городов
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cities: ['Якутск', 'Нерюнгри', 'Мирный', 'Удачный', 'Алдан'],
        }),
      })
    })

    // Мокируем API ответ для поиска маршрутов (новый SmartRoute endpoint)
    await page.route('**/smart-route/build', async (route) => {
      const request = route.request()
      const postData = request.postDataJSON()
      const from = postData?.from
      const to = postData?.to

      if (from === 'Якутск' && to === 'Нерюнгри') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            route: {
              id: 'route-1',
              fromCity: {
                id: 'yakutsk',
                name: 'Якутск',
                coordinates: { latitude: 62.0278, longitude: 129.7042 },
              },
              toCity: {
                id: 'nerungri',
                name: 'Нерюнгри',
                coordinates: { latitude: 56.6583, longitude: 124.7264 },
              },
              segments: [
                {
                  segmentId: 'seg-1',
                  type: 'bus',
                  from: {
                    id: 'stop-1',
                    name: 'Якутск',
                    type: 'bus_station',
                    coordinates: { latitude: 62.0278, longitude: 129.7042 },
                    cityId: 'yakutsk',
                  },
                  to: {
                    id: 'stop-2',
                    name: 'Нерюнгри',
                    type: 'bus_station',
                    coordinates: { latitude: 56.6583, longitude: 124.7264 },
                    cityId: 'nerungri',
                  },
                  distance: { value: 800, unit: 'km' },
                  duration: { value: 120, unit: 'minutes', display: '2 часа' },
                  price: { base: 5000, total: 5000, currency: 'RUB', display: '5 000 ₽' },
                  schedule: { departureTime: '08:00', arrivalTime: '10:00' },
                },
              ],
              totalDistance: { value: 800, unit: 'km' },
              totalDuration: { value: 120, unit: 'minutes', display: '2 часа' },
              totalPrice: { base: 5000, total: 5000, currency: 'RUB', display: '5 000 ₽' },
            },
            alternatives: [],
            executionTimeMs: 100,
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            route: null,
            alternatives: [],
            executionTimeMs: 100,
          }),
        })
      }
    })

    // Ждем загрузки формы поиска
    await page.waitForSelector('form', { timeout: 5000 })

    // Заполняем поле "Откуда"
    const fromInput = page.getByTestId('city-autocomplete-from')
    await fromInput.fill('Якутск')
    await fromInput.press('Enter') // Выбираем город из автокомплита

    // Ждем появления автокомплита и выбираем город
    await page.waitForTimeout(500) // Даем время на фильтрацию
    const fromOption = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first()
    if (await fromOption.isVisible()) {
      await fromOption.click()
    }

    // Заполняем поле "Куда"
    const toInput = page.getByTestId('city-autocomplete-to')
    await toInput.fill('Нерюнгри')
    await toInput.press('Enter')

    // Ждем появления автокомплита и выбираем город
    await page.waitForTimeout(500)
    const toOption = page.getByRole('listitem').filter({ hasText: 'Нерюнгри' }).first()
    if (await toOption.isVisible()) {
      await toOption.click()
    }

    // Нажимаем кнопку поиска
    const searchButton = page.getByRole('button', { name: /найти маршрут/i })
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    // Проверяем переход на страницу результатов
    // URL может содержать закодированные параметры, проверяем более гибко
    await expect(page).toHaveURL(/\/routes\?.*from=.*Якутск.*to=.*Нерюнгри|from=%D0%AF%D0%BA%D1%83%D1%82%D1%81%D0%BA.*to=%D0%9D%D0%B5%D1%80%D1%8E%D0%BD%D0%B3%D1%80%D0%B8/, { timeout: 10000 })

    // Проверяем наличие результатов поиска
    await page.waitForSelector('text=Результаты поиска маршрутов', { timeout: 10000 })
    await expect(page.getByText('Якутск').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Нерюнгри').first()).toBeVisible({ timeout: 10000 })
  })

  test('should display error on invalid search (same cities)', async ({ page }) => {
    // Мокируем API ответ для городов
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cities: ['Якутск', 'Нерюнгри', 'Мирный'],
        }),
      })
    })

    // Ждем загрузки формы
    await page.waitForSelector('form', { timeout: 5000 })

    // Заполняем оба поля одинаковым городом
    const fromInput = page.getByTestId('city-autocomplete-from')
    await fromInput.fill('Якутск')
    await page.waitForTimeout(500)
    const fromOption = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first()
    if (await fromOption.isVisible()) {
      await fromOption.click()
    }

    const toInput = page.getByTestId('city-autocomplete-to')
    await toInput.fill('Якутск')
    await page.waitForTimeout(500)
    const toOption = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first()
    if (await toOption.isVisible()) {
      await toOption.click()
    }

    // Кнопка поиска должна быть disabled
    const searchButton = page.getByRole('button', { name: /найти маршрут/i })
    await expect(searchButton).toBeDisabled()
  })

  test('should display error when required fields are empty', async ({ page }) => {
    // Мокируем API ответ для городов
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cities: ['Якутск', 'Нерюнгри'],
        }),
      })
    })

    // Ждем загрузки формы
    await page.waitForSelector('form', { timeout: 5000 })

    // Кнопка поиска должна быть disabled при пустых полях
    const searchButton = page.getByRole('button', { name: /найти маршрут/i })
    await expect(searchButton).toBeDisabled()
  })

  test('should handle API error gracefully', async ({ page }) => {
    // Мокируем API ответ для городов
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cities: ['Якутск', 'Нерюнгри'],
        }),
      })
    })

    // Мокируем ошибку API при поиске маршрутов (новый SmartRoute endpoint)
    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Внутренняя ошибка сервера',
          },
        }),
      })
    })

    // Заполняем форму
    await page.waitForSelector('form', { timeout: 5000 })

    const fromInput = page.getByTestId('city-autocomplete-from')
    await fromInput.fill('Якутск')
    await page.waitForTimeout(500)
    const fromOption = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first()
    if (await fromOption.isVisible()) {
      await fromOption.click()
    }

    const toInput = page.getByTestId('city-autocomplete-to')
    await toInput.fill('Нерюнгри')
    await page.waitForTimeout(500)
    const toOption = page.getByRole('listitem').filter({ hasText: 'Нерюнгри' }).first()
    if (await toOption.isVisible()) {
      await toOption.click()
    }

    // Отправляем форму
    const searchButton = page.getByRole('button', { name: /найти маршрут/i })
    await expect(searchButton).toBeEnabled()
    await searchButton.click()

    // Проверяем отображение ошибки
    await page.waitForSelector('text=Результаты поиска маршрутов', { timeout: 5000 })
    // Ошибка должна отображаться на странице результатов
    const errorElement = page.getByTestId('routes-search-error')
    await expect(errorElement).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to route details when route is selected', async ({ page }) => {
    // Мокируем API ответы
    await page.route('**/api/v1/cities', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cities: ['Якутск', 'Нерюнгри'],
        }),
      })
    })

    await page.route('**/smart-route/build', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          route: {
            id: 'route-1',
            fromCity: {
              id: 'yakutsk',
              name: 'Якутск',
              coordinates: { latitude: 62.0278, longitude: 129.7042 },
            },
            toCity: {
              id: 'nerungri',
              name: 'Нерюнгри',
              coordinates: { latitude: 56.6583, longitude: 124.7264 },
            },
            segments: [
              {
                segmentId: 'seg-1',
                type: 'bus',
                from: {
                  id: 'stop-1',
                  name: 'Якутск',
                  type: 'bus_station',
                  coordinates: { latitude: 62.0278, longitude: 129.7042 },
                  cityId: 'yakutsk',
                },
                to: {
                  id: 'stop-2',
                  name: 'Нерюнгри',
                  type: 'bus_station',
                  coordinates: { latitude: 56.6583, longitude: 124.7264 },
                  cityId: 'nerungri',
                },
                distance: { value: 800, unit: 'km' },
                duration: { value: 120, unit: 'minutes', display: '2 часа' },
                price: { base: 5000, total: 5000, currency: 'RUB', display: '5 000 ₽' },
                schedule: { departureTime: '08:00', arrivalTime: '10:00' },
              },
            ],
            totalDistance: { value: 800, unit: 'km' },
            totalDuration: { value: 120, unit: 'minutes', display: '2 часа' },
            totalPrice: { base: 5000, total: 5000, currency: 'RUB', display: '5 000 ₽' },
          },
          alternatives: [],
          executionTimeMs: 100,
        }),
      })
    })

    // Переходим на страницу результатов (симулируем поиск)
    await page.goto('/routes?from=Якутск&to=Нерюнгри', { waitUntil: 'domcontentloaded' })
    
    // Ждем завершения API запроса (новый endpoint)
    await page.waitForResponse('**/smart-route/build', { timeout: 10000 })

    // Ждем загрузки результатов
    await expect(page.getByText('Результаты поиска маршрутов')).toBeVisible({ timeout: 10000 })
    
    // Ждем завершения загрузки страницы
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    
    // Ждем появления маршрутов (текст "Якутск" и "Нерюнгри" должны быть видны)
    await expect(page.getByText('Якутск').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Нерюнгри').first()).toBeVisible({ timeout: 10000 })

    // Ждем появления кнопки "Выбрать маршрут"
    // Используем getByRole с фильтром по тексту как основной селектор (более надёжный)
    const selectButton = page.getByRole('button', { name: /выбрать маршрут/i }).first()
    
    // Используем web-first assertion для автоматического ожидания
    await expect(selectButton).toBeVisible({ timeout: 15000 })
    await expect(selectButton).toBeEnabled({ timeout: 5000 })
    
    // Кликаем на кнопку
    await selectButton.click()

    // Проверяем переход на страницу деталей маршрута
    await expect(page).toHaveURL(/\/routes\/details\?routeId=route-1/, { timeout: 10000 })
  })
})

