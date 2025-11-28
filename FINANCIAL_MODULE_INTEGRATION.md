# Интеграция Депозитной Системы B2B-портала

## Обзор

Депозитная система обеспечивает мгновенные транзакции, строгий контроль расходов и автоматизированную отчетность для корпоративных клиентов.

## 🏗️ Архитектура

### База данных

Новые таблицы (миграции 013-016):

1. **`corporate_accounts`** - Корпоративные депозитные счета
2. **`transaction_log`** - Транзакционный лог всех движений средств
3. **`cost_centers`** - Центры затрат (Cost Centers)
4. **`user_spending_limits`** - Лимиты на расходы пользователей

### Доменные сущности

- `CorporateAccount` - Управление корпоративным счетом
- `TransactionLog` - Логирование транзакций
- `CostCenter` - Центры затрат с иерархией
- `UserSpendingLimit` - Лимиты с гибкой настройкой

### Сервисы

- `CorporateAccountService` - Атомарные транзакции и баланс
- `UserSpendingLimitService` - Контроль лимитов
- `BalanceNotificationService` - Уведомления о низком балансе

## 🚀 Быстрый старт

### 1. Выполнение миграций базы данных

```bash
# Core financial tables
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/013_create_corporate_accounts_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/014_create_cost_centers_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/015_create_transaction_log_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/016_create_user_spending_limits_table.sql
```

### 2. Создание корпоративного счета

```sql
INSERT INTO corporate_accounts (
    company_id,
    current_deposit_balance,
    total_deposited,
    currency,
    minimum_balance_threshold,
    auto_topup_enabled,
    auto_topup_amount,
    auto_topup_threshold
) VALUES (
    'company-uuid',
    100000.00,
    100000.00,
    'RUB',
    25000.00,
    true,
    50000.00,
    30000.00
);
```

### 3. Настройка лимитов пользователя

```sql
INSERT INTO user_spending_limits (
    company_id,
    user_id,
    limit_type,
    limit_amount,
    require_approval,
    approval_threshold
) VALUES (
    'company-uuid',
    'user-uuid',
    'monthly',
    50000.00,
    true,
    10000.00
);
```

## 📡 API Эндпоинты

### Управление счетом

#### Получить информацию о счете
```http
GET /api/b2b/financial/corporate-accounts/{companyId}
Authorization: Bearer {token}
```

#### Проверить баланс
```http
GET /api/b2b/financial/corporate-accounts/{companyId}/balance?amount=15000
Authorization: Bearer {token}
```

#### Пополнить счет
```http
POST /api/b2b/financial/corporate-accounts/{companyId}/deposit
Content-Type: application/json

{
  "amount": 50000,
  "description": "Пополнение корпоративного счета",
  "externalReference": "payment-12345"
}
```

#### Списать средства
```http
POST /api/b2b/financial/corporate-accounts/{companyId}/withdraw
Content-Type: application/json

{
  "amount": 15000,
  "description": "Покупка авиабилета Москва-Сочи",
  "userId": "user-uuid",
  "costCenterId": "cost-center-uuid",
  "ticketId": "ticket-uuid",
  "category": "travel"
}
```

### Управление лимитами

#### Создать лимит
```http
POST /api/b2b/financial/limits
Content-Type: application/json

{
  "companyId": "company-uuid",
  "userId": "user-uuid",
  "limitType": "monthly",
  "limitAmount": 100000,
  "requireApproval": true,
  "approvalThreshold": 25000,
  "maxTransactionsPerPeriod": 50,
  "warningThresholdPercent": 80
}
```

#### Проверить лимиты перед транзакцией
```http
POST /api/b2b/financial/corporate-accounts/{companyId}/check-limits
Content-Type: application/json

{
  "amount": 30000,
  "userId": "user-uuid",
  "costCenterId": "cost-center-uuid",
  "category": "travel"
}
```

## ⚙️ Бизнес-логика

### Атомарные транзакции

Все операции выполняются в рамках одной базы данных с уровнем изоляции `READ COMMITTED`:

```typescript
// Пример атомарного списания
const result = await corporateAccountService.processWithdrawal({
  companyId: 'company-uuid',
  amount: 15000,
  description: 'Покупка билета',
  userId: 'user-uuid',
  costCenterId: 'cost-center-uuid'
});

// result содержит:
// - transaction: TransactionLog
// - updatedAccount: CorporateAccount
// - updatedLimits: UserSpendingLimit[]
// - updatedCostCenter: CostCenter
```

### Контроль лимитов

Многоуровневая проверка лимитов:

1. **Общие лимиты пользователя** - применяются ко всем тратам
2. **Лимиты центра затрат** - применяются к тратам в рамках Cost Center
3. **Лимиты на транзакцию** - максимальная сумма одной операции
4. **Категорийные лимиты** - ограничения по категориям трат

### Автоматические уведомления

Система уведомлений работает по расписанию:

```typescript
// Проверка уведомлений (вызывается по cron)
const results = await balanceNotificationService.checkAndSendBalanceNotifications();
const limitResults = await balanceNotificationService.checkAndSendLimitNotifications();
```

Типы уведомлений:
- **Предупреждение** (80% использования лимита)
- **Критическое** (50% от порогового значения)
- **Исчерпание** (баланс = 0)

## 🏛️ Центры затрат

### Иерархическая структура

```
Компания
├── IT отдел (cost_center_1)
│   ├── Разработка (cost_center_1_1)
│   └── Инфраструктура (cost_center_1_2)
├── Отдел продаж (cost_center_2)
└── Бухгалтерия (cost_center_3)
```

### Бюджетные периоды

- **Дневные** - сброс в 00:00
- **Недельные** - сброс в понедельник 00:00
- **Месячные** - сброс в указанный день месяца
- **Квартальные** - сброс в начало квартала
- **Годовые** - сброс 1 января

## 📊 Отчетность и аналитика

### Финансовая аналитика

```typescript
// Получить аналитику по пользователю
const analytics = await userSpendingLimitService.getUserSpendingAnalytics(
  'user-uuid',
  'company-uuid'
);

// Аналитика по компании
const stats = await userSpendingLimitService.getCompanyLimitStatistics('company-uuid');
```

### Транзакционный лог

Все движения средств логируются с полной аудитом:

```sql
-- Поиск транзакций за период
SELECT * FROM transaction_log
WHERE company_id = 'company-uuid'
  AND transaction_date BETWEEN '2024-01-01' AND '2024-01-31'
  AND transaction_type = 'withdrawal'
ORDER BY transaction_date DESC;
```

## 🔄 Интеграция с B2B билетами

### Автоматическое списание при покупке билета

```typescript
// В B2BTicketService
async confirmTicket(ticketId: string, userId: string): Promise<B2BTicket> {
  const ticket = await this.getTicketById(ticketId);

  // Проверяем лимиты и баланс
  const limitCheck = await this.limitService.checkLimits({
    userId,
    companyId: ticket.companyId,
    amount: ticket.price,
    costCenterId: ticket.department
  });

  if (!limitCheck.allowed) {
    throw new Error(`Transaction blocked: ${limitCheck.reason}`);
  }

  // Выполняем атомарную транзакцию
  const transaction = await this.corporateAccountService.processWithdrawal({
    companyId: ticket.companyId,
    amount: ticket.price,
    description: `Билет: ${ticket.eventName}`,
    userId,
    costCenterId: ticket.department,
    ticketId
  });

  // Обновляем статус билета
  return await this.updateTicketStatus(ticketId, 'confirmed');
}
```

### Автоматический возврат при отмене

```typescript
// В B2BTicketService при отмене билета
async cancelTicket(ticketId: string, userId: string, reason: string): Promise<B2BTicket> {
  const ticket = await this.getTicketById(ticketId);

  // Находим оригинальную транзакцию
  const originalTransaction = await this.transactionLogRepository.findByTicketId(ticketId);

  if (originalTransaction) {
    // Выполняем возврат
    await this.corporateAccountService.processRefund(
      originalTransaction.id,
      ticket.price,
      reason
    );
  }

  return await this.updateTicketStatus(ticketId, 'cancelled');
}
```

## 🔧 Настройки и конфигурация

### Переменные окружения

```env
# Финансовый модуль
FINANCIAL_LOW_BALANCE_THRESHOLD=25000
FINANCIAL_CRITICAL_BALANCE_THRESHOLD=10000
FINANCIAL_AUTO_TOPUP_ENABLED=true
FINANCIAL_WARNING_THRESHOLD_PERCENT=80

# Уведомления
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_SMS_ENABLED=true
NOTIFICATION_WEBHOOK_URL=https://hooks.slack.com/...

# Лимиты по умолчанию
DEFAULT_MONTHLY_LIMIT=100000
DEFAULT_PER_TRANSACTION_LIMIT=50000
DEFAULT_MAX_TRANSACTIONS_PER_DAY=20
```

### Кастомизация правил

```typescript
// Правила проверки лимитов
const customLimitRules = {
  // Дополнительная проверка для VIP-клиентов
  vipClientRule: async (user, amount) => {
    if (user.isVip && amount < 1000000) {
      return { allowed: true, requiresApproval: false };
    }
  },

  // Правило для экстренных ситуаций
  emergencyRule: async (user, amount, category) => {
    if (category === 'emergency_travel' && user.hasEmergencyAccess) {
      return { allowed: true, requiresApproval: false };
    }
  }
};
```

## 🔒 Безопасность

### Криптографическая защита

- Все финансовые данные шифруются в базе данных
- Транзакции подписываются цифровой подписью
- Аудитный лог защищен от изменений

### Ролевой доступ

- `finance_admin` - полный доступ к финансовым операциям
- `accountant` - просмотр и создание отчетов
- `booking_agent` - создание транзакций в пределах лимитов
- `company_admin` - управление лимитами компании

### Rate limiting

```typescript
// Ограничения на API
const financialRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100, // 100 запросов в минуту
});

const transactionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // 20 транзакций в минуту
});
```

## 📈 Мониторинг и метрики

### Ключевые метрики

- **Объем транзакций** в минуту/час/день
- **Среднее время обработки** транзакции
- **Процент отказов** по лимитам
- **Количество автопополнений**
- **Скорость реакции** на уведомления

### Health checks

```http
GET /api/b2b/financial/health
```

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T10:00:00Z",
    "services": {
      "corporateAccount": "healthy",
      "spendingLimits": "healthy",
      "costCenters": "healthy",
      "notifications": "healthy"
    }
  }
}
```

## 🚨 Обработка ошибок

### Типы ошибок

```typescript
enum FinancialError {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  ACCOUNT_NOT_ACTIVE = 'ACCOUNT_NOT_ACTIVE',
  INVALID_TRANSACTION_AMOUNT = 'INVALID_TRANSACTION_AMOUNT',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION'
}
```

### Пример обработки

```typescript
try {
  const result = await corporateAccountService.processWithdrawal(request);

  if (result.requiresApproval) {
    // Отправка на одобрение
    await approvalService.requestApproval(result);
    return { status: 'pending_approval' };
  }

  return { status: 'success', transaction: result.transaction };

} catch (error) {
  if (error.code === FinancialError.INSUFFICIENT_FUNDS) {
    // Предложить автопополнение
    return {
      status: 'insufficient_funds',
      suggestedTopup: calculateSuggestedTopup(error.data)
    };
  }

  throw error;
}
```

## 📝 Тестирование

### Unit тесты

```typescript
// Тест атомарной транзакции
describe('CorporateAccountService.processWithdrawal', () => {
  it('should successfully process withdrawal within limits', async () => {
    const result = await service.processWithdrawal({
      companyId: 'test-company',
      amount: 1000,
      description: 'Test withdrawal'
    });

    expect(result.success).toBe(true);
    expect(result.transaction).toBeDefined();
    expect(result.updatedAccount.currentDepositBalance)
      .toBe(initialBalance - 1000);
  });
});
```

### Интеграционные тесты

```typescript
// Тест полной интеграции с B2B билетами
describe('B2B Ticket Purchase Flow', () => {
  it('should complete full ticket purchase with limit checks', async () => {
    // Создание пользователя с лимитами
    // Пополнение счета
    // Покупка билета
    // Проверка всех транзакций
    // Отмена билета и возврат
  });
});
```

## 🔄 Планируемые улучшения

1. **Мультивалютность** - поддержка нескольких валют
2. **Интеграция с банками** - прямые платежи
3. **AI-прогнозирование** - предсказание потребности в пополнении
4. **Расширенная аналитика** - дашборды и отчеты
5. **API для внешних систем** - интеграция с ERP/CRM

## 📞 Поддержка

При возникновении вопросов:

1. Проверьте логи приложения
2. Проверьте status финансовых сервисов: `/api/b2b/financial/health`
3. Свяжитесь с командой разработки

---

**Депозитная система готова к использованию! 🚀**

Все компоненты интегрированы с существующей B2B архитектурой и обеспечивают полный цикл управления корпоративными финансами.