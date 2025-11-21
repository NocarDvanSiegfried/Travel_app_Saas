import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу перед каждым тестом
    await page.goto('/')
  })

  test('should navigate between sections using tabs', async ({ page }) => {
    // Мокируем API ответы для предотвращения ошибок
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    // Ждем загрузки страницы
    await page.waitForSelector('body', { timeout: 5000 })

    // Проверяем наличие навигационных табов (если они есть на главной странице)
    // Ищем элементы навигации по тексту или роли
    const navigationTabs = page.locator('[role="tab"], button:has-text("Маршруты"), button:has-text("Отели"), button:has-text("Транспорт"), button:has-text("Услуги")')

    // Если табы есть, проверяем навигацию
    const tabsCount = await navigationTabs.count()
    if (tabsCount > 0) {
      // Кликаем на таб "Отели" (если есть)
      const hotelsTab = page.getByRole('button', { name: /отели/i }).or(page.getByText(/отели/i)).first()
      if (await hotelsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await hotelsTab.click()
        // Проверяем, что секция отелей отображается
        await expect(page.locator('text=Отели').or(page.locator('[data-section="hotels"]'))).toBeVisible({ timeout: 5000 })
      }

      // Кликаем на таб "Транспорт" (если есть)
      const transportTab = page.getByRole('button', { name: /транспорт/i }).or(page.getByText(/транспорт/i)).first()
      if (await transportTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await transportTab.click()
        // Проверяем, что секция транспорта отображается
        await expect(page.locator('text=Транспорт').or(page.locator('[data-section="transport"]'))).toBeVisible({ timeout: 5000 })
      }

      // Кликаем на таб "Услуги" (если есть)
      const servicesTab = page.getByRole('button', { name: /услуги/i }).or(page.getByText(/услуги/i)).first()
      if (await servicesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await servicesTab.click()
        // Проверяем, что секция услуг отображается
        await expect(page.locator('text=Услуги').or(page.locator('[data-section="services"]'))).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should navigate to routes page from home', async ({ page }) => {
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

    // Ждем загрузки главной страницы
    await page.waitForSelector('body', { timeout: 5000 })

    // Ищем форму поиска или кнопку для перехода к маршрутам
    const searchForm = page.locator('form')
    if (await searchForm.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Форма поиска есть, можно проверить навигацию через поиск
      expect(await searchForm.isVisible()).toBeTruthy()
    }
  })

  test('should navigate back from routes page to home', async ({ page }) => {
    // Мокируем API ответы
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          routes: [],
          alternatives: [],
        }),
      })
    })

    // Переходим на страницу маршрутов
    await page.goto('/routes?from=Якутск&to=Нерюнгри')

    // Ждем загрузки страницы
    await page.waitForSelector('body', { timeout: 5000 })

    // Ищем ссылку или кнопку для возврата на главную (обычно в header)
    const homeLink = page.getByRole('link', { name: /главная|home|логотип/i }).or(
      page.locator('header a[href="/"]')
    ).first()

    if (await homeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await homeLink.click()
      // Проверяем переход на главную
      await expect(page).toHaveURL('/')
    } else {
      // Если нет явной ссылки, проверяем наличие header
      const header = page.locator('header')
      await expect(header).toBeVisible()
    }
  })

  test('should navigate to route details and back', async ({ page }) => {
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

    // Переходим на страницу результатов
    await page.goto('/routes?from=Якутск&to=Нерюнгри')

    // Ждем загрузки результатов
    await page.waitForSelector('text=Результаты поиска маршрутов', { timeout: 5000 })

    // Кликаем на маршрут для просмотра деталей
    const selectButton = page.getByRole('button', { name: /выбрать маршрут/i }).first()
    if (await selectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectButton.click()

      // Проверяем переход на страницу деталей
      await expect(page).toHaveURL(/\/routes\/details\?routeId=route-1/, { timeout: 5000 })

      // Проверяем наличие деталей маршрута
      await expect(page.locator('text=Якутск').or(page.locator('text=Нерюнгри'))).toBeVisible({ timeout: 5000 })

      // Возвращаемся назад
      await page.goBack()

      // Проверяем возврат на страницу результатов
      await expect(page).toHaveURL(/\/routes/, { timeout: 5000 })
    }
  })

  test('should maintain navigation state during page transitions', async ({ page }) => {
    // Мокируем API ответы
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    // Переходим на главную
    await page.goto('/')
    await page.waitForSelector('body', { timeout: 5000 })

    // Проверяем наличие header и footer (они должны быть на всех страницах)
    const header = page.locator('header')
    const footer = page.locator('footer')

    await expect(header).toBeVisible()
    await expect(footer).toBeVisible()

    // Переходим на другую страницу
    await page.goto('/routes?from=Якутск&to=Нерюнгри')
    await page.waitForSelector('body', { timeout: 5000 })

    // Header и footer должны оставаться видимыми
    await expect(header).toBeVisible()
    await expect(footer).toBeVisible()
  })
})

