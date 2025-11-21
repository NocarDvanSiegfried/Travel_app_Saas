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

    // Мокируем API ответ для поиска маршрутов
    await page.route('**/api/v1/routes/search*', async (route) => {
      const url = new URL(route.request().url())
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')

      if (from === 'Якутск' && to === 'Нерюнгри') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            routes: [
              {
                routeId: 'route-1',
                fromCity: 'Якутск',
                toCity: 'Нерюнгри',
                date: '2024-12-25',
                passengers: 1,
                segments: [],
                totalDuration: 120,
                totalPrice: 5000,
                transferCount: 0,
                transportTypes: ['bus'],
                departureTime: '08:00',
                arrivalTime: '10:00',
              },
            ],
            alternatives: [],
            dataMode: 'real',
            dataQuality: 1,
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            routes: [],
            alternatives: [],
          }),
        })
      }
    })

    // Ждем загрузки формы поиска
    await page.waitForSelector('form', { timeout: 5000 })

    // Заполняем поле "Откуда"
    const fromInput = page.getByLabel('Откуда')
    await fromInput.fill('Якутск')
    await fromInput.press('Enter') // Выбираем город из автокомплита

    // Ждем появления автокомплита и выбираем город
    await page.waitForTimeout(500) // Даем время на фильтрацию
    const fromOption = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first()
    if (await fromOption.isVisible()) {
      await fromOption.click()
    }

    // Заполняем поле "Куда"
    const toInput = page.getByLabel('Куда')
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
    await expect(page).toHaveURL(/\/routes\?.*from=Якутск.*to=Нерюнгри/)

    // Проверяем наличие результатов поиска
    await page.waitForSelector('text=Результаты поиска маршрутов', { timeout: 5000 })
    await expect(page.getByText('Якутск')).toBeVisible()
    await expect(page.getByText('Нерюнгри')).toBeVisible()
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
    const fromInput = page.getByLabel('Откуда')
    await fromInput.fill('Якутск')
    await page.waitForTimeout(500)
    const fromOption = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first()
    if (await fromOption.isVisible()) {
      await fromOption.click()
    }

    const toInput = page.getByLabel('Куда')
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

    // Мокируем ошибку API при поиске маршрутов
    await page.route('**/api/v1/routes/search*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Внутренняя ошибка сервера',
          },
        }),
      })
    })

    // Заполняем форму
    await page.waitForSelector('form', { timeout: 5000 })

    const fromInput = page.getByLabel('Откуда')
    await fromInput.fill('Якутск')
    await page.waitForTimeout(500)
    const fromOption = page.getByRole('listitem').filter({ hasText: 'Якутск' }).first()
    if (await fromOption.isVisible()) {
      await fromOption.click()
    }

    const toInput = page.getByLabel('Куда')
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
    await expect(page.getByText(/ошибка|error/i).first()).toBeVisible({ timeout: 10000 })
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

    await page.route('**/api/v1/routes/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          routes: [
            {
              routeId: 'route-1',
              fromCity: 'Якутск',
              toCity: 'Нерюнгри',
              date: '2024-12-25',
              passengers: 1,
              segments: [],
              totalDuration: 120,
              totalPrice: 5000,
              transferCount: 0,
              transportTypes: ['bus'],
              departureTime: '08:00',
              arrivalTime: '10:00',
            },
          ],
          alternatives: [],
        }),
      })
    })

    // Переходим на страницу результатов (симулируем поиск)
    await page.goto('/routes?from=Якутск&to=Нерюнгри')

    // Ждем загрузки результатов
    await page.waitForSelector('text=Результаты поиска маршрутов', { timeout: 5000 })

    // Находим кнопку "Выбрать маршрут" и кликаем
    const selectButton = page.getByRole('button', { name: /выбрать маршрут/i }).first()
    await expect(selectButton).toBeVisible()
    await selectButton.click()

    // Проверяем переход на страницу деталей маршрута
    await expect(page).toHaveURL(/\/routes\/details\?routeId=route-1/)
  })
})

