# Архитектура Frontend (React)

## 1. Общие принципы React Architecture

### 1.1 Разделение ответственности
Frontend является чистым UI-слоем:
- Не содержит бизнес-логики
- Не знает о структуре БД
- Не хранит важные данные локально
- Только отображение и взаимодействие с пользователем

### 1.2 Feature-Based Architecture
**Принцип:** Организация кода по функциональным возможностям, а не по типам файлов

## 2. Структура проекта (Feature-Based)

### 2.1 Общая структура
```
src/
├── app/                    # Application layer
│   ├── routing/
│   └── app.tsx
├── screens/                # Screen layer
│   ├── home/
│   ├── search/
│   ├── profile/
│   └── orders/
├── modules/                # Business modules
│   ├── routes/
│   │   ├── features/
│   │   │   ├── route-search/
│   │   │   ├── route-list/
│   │   │   └── route-details/
│   │   └── domain/
│   ├── orders/
│   ├── insurance/
│   └── assistant/
├── data/                   # Data layer
│   ├── repositories/
│   └── sources/
└── shared/                 # Shared layer
    ├── constants/
    ├── types/
    ├── utils/
    ├── services/
    ├── stores/
    └── ui/
```

### 2.2 Структура модуля
```
modules/
└── routes/
    ├── features/           # UI features
    │   ├── route-search/
    │   │   ├── route-search.tsx
    │   │   ├── route-search.test.tsx
    │   │   ├── hooks/
    │   │   ├── utils/
    │   │   ├── ui-store/
    │   │   ├── constants.ts
    │   │   ├── types.ts
    │   │   └── index.ts
    │   └── route-list/
    └── domain/              # Business logic
        ├── services/
        ├── stores/
        ├── utils/
        ├── types/
        └── constants/
```

## 3. Компонентная архитектура

### 3.1 Compound Components
**Принцип:** Группировка связанных компонентов в один namespace

**Структура:**
```
route-list/
├── route-list.tsx
├── route-list.item.tsx
├── route-list.skeleton.tsx
├── route-list.empty.tsx
└── route-list.error.tsx
```

**Использование:**
```tsx
<RouteList routes={routes} />

<RouteList.Skeleton />
<RouteList.Empty />
<RouteList.Error />
```

### 3.2 Типы компонентов

#### Presentational (Dumb Components)
**Ответственность:** Только отображение

- `Button`, `Input`, `Card`, `Modal`
- Не знают о бизнес-логике
- Получают данные через props
- Вызывают callbacks для действий
- Легко тестируются

#### Container (Smart Components)
**Ответственность:** Управление состоянием и данными

- Подключаются к API
- Управляют состоянием
- Передают данные в presentational компоненты
- Обрабатывают события

#### Страницы (Pages)
**Ответственность:** Композиция компонентов

- Собирают контейнеры и UI-компоненты
- Управляют роутингом страницы
- Обрабатывают общие события страницы

### 3.3 Структура компонента
```
user-info/
├── header/
│   ├── hooks/
│   ├── utils/
│   ├── header.tsx
│   └── index.ts
├── user-info.tsx
├── user-info.test.tsx
├── constants.ts
├── types.ts
└── index.ts
```

### 3.2 Основные компоненты

#### Карта
- `MapContainer` — контейнер карты
- `MapView` — отображение карты
- `RouteLayer` — слой маршрутов
- `TransportLine` — линия транспорта
- `AttractionMarker` — маркер достопримечательности
- `EventMarker` — маркер события
- `MiniObjectMarker` — маркер мини-объекта

#### Маршруты
- `RouteSearchForm` — форма поиска
- `RouteList` — список маршрутов
- `RouteCard` — карточка маршрута
- `RouteDetails` — детали маршрута
- `RouteTimeline` — временная линия

#### Помощник (мамонтёнок)
- `AssistantWidget` — виджет помощника
- `AssistantDialog` — диалог с помощником
- `AssistantMessage` — сообщение помощника
- `AssistantAvatar` — аватар мамонтёнка
- `WeatherDisplay` — отображение погоды
- `RiskAlert` — предупреждение о рисках

#### Услуги
- `InsuranceSelector` — выбор страховки
- `PremiumSupportCard` — карточка премиальной поддержки
- `ServiceCheckout` — оформление услуг

#### Авторизация
- `LoginForm` — форма входа
- `RegisterForm` — форма регистрации
- `AuthGuard` — защита маршрутов

## 4. Управление состоянием

### 4.1 Локальное состояние
**useState:**
- Простое состояние компонента
- UI-состояние (открыт/закрыт, активен/неактивен)

**useReducer:**
- Сложное локальное состояние
- Множественные действия
- Предсказуемые обновления

### 4.2 Глобальное состояние
**React Context:**
- Состояние приложения
- Состояние авторизации
- Тема приложения

**Структура Context:**
```
user-context/
├── user-context-provider/
│   ├── user-context-provider.tsx
│   ├── user-context-provider.test.tsx
│   └── index.ts
├── user-context.ts
└── index.ts
```

**Именование:**
```typescript
export interface UserContextProps {
  isAuth: boolean
  user: User | null
}

export const UserContext = createContext<UserContextProps>({
  isAuth: false,
  user: null,
})
```

**Contexts проекта:**
- `AuthContext` — состояние авторизации
- `ThemeContext` — тема приложения
- `AppContext` — общее состояние приложения

### 4.3 Server State
**React Query / SWR:**
- Кэширование данных с сервера
- Автоматическое обновление
- Оптимистичные обновления
- Управление загрузкой и ошибками

### 4.4 UI Store Pattern
**Принцип:** Локальное состояние компонента в отдельном store

**Структура:**
```
cart/
├── ui-store/
│   ├── ui-store.ts
│   └── index.ts
├── cart.tsx
└── index.ts
```

**Использование:**
```tsx
import { useLocalObservable } from 'mobx-react-lite'
import { createUIStore } from './ui-store'

export function Card() {
  const { name, list } = useLocalObservable(createUIStore)
  
  return <Wrapper>...</Wrapper>
}
```

## 5. Hooks Organization

### 5.1 Custom Hooks
**Структура:**
```
user-info/
├── hooks/
│   ├── use-user-data/
│   │   ├── utils/
│   │   ├── use-user-data.ts
│   │   ├── use-user-data.test.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── index.ts
```

### 5.2 useLogic Hook
**Принцип:** Вся логика компонента в отдельном хуке

**Структура:**
```
card/
├── use-logic/
│   ├── use-logic.ts
│   └── index.ts
├── card.tsx
└── index.ts
```

## 6. Utils Organization

### 6.1 Component Utils
**Структура:**
```
user-info/
├── utils/
│   ├── format-price-to-view/
│   │   ├── format-price-to-view.ts
│   │   └── index.ts
│   └── index.ts
```

**Принципы:**
- Каждая утилита в отдельной папке
- Нет общего файла utils.ts
- Специфичные утилиты для компонента

### 6.2 Shared Utils
**Структура:**
```
shared/
└── utils/
    ├── format-date/
    ├── format-price/
    └── index.ts
```

## 7. Работа с API

### 7.1 API-сервисы
**Структура:**
```
services/
├── api/
│   ├── client.ts        # HTTP-клиент (Axios)
│   ├── routes.ts        # API маршрутов
│   ├── auth.ts          # API авторизации
│   ├── orders.ts        # API заказов
│   ├── insurance.ts    # API страховки
│   └── assistant.ts     # API помощника
└── types.ts             # Типы API
```

### 7.2 HTTP-клиент
- Базовый URL из конфигурации
- Автоматическое добавление JWT токена
- Обработка ошибок
- Интерцепторы для логирования

### 7.3 Типизация API
- TypeScript интерфейсы для всех запросов/ответов
- Типизированные функции API
- Автодополнение в IDE

## 8. Роутинг

### 8.1 Структура маршрутов
- `React Router` для навигации
- Защищенные маршруты (AuthGuard)
- Ленивая загрузка страниц (code splitting)

### 8.2 Маршруты приложения
```
/                    → HomePage
/search              → SearchPage
/routes/:id          → RouteDetailsPage
/orders              → OrdersPage
/profile             → ProfilePage
/login               → LoginPage
/register            → RegisterPage
```

## 9. TypeScript Best Practices

### 9.1 Props Definition
**Использование type вместо interface:**
```typescript
type Props = {
  title: string
  userName: string
  onClick: () => void
}

export const UserInfo = ({ title, userName, onClick }: Props) => {
  // ...
}
```

### 9.2 React Namespace
**Избегать:**
```tsx
import React from 'react'

type Props = {
  title: React.ReactNode
}

const User = (props: Props) => {
  const [isShow, setShowFlag] = React.useState(false)
}
```

**Предпочтительно:**
```tsx
import { type ReactNode, useState } from 'react'

type Props = {
  title: ReactNode
}

const User = (props: Props) => {
  const [isShow, setShowFlag] = useState(false)
}
```

### 9.3 Enums
**Структура:**
```
my-service/
├── constants.ts
├── enums.ts
├── my-service.ts
└── index.ts
```

## 10. Component Logic Separation

### 10.1 Handlers Outside JSX
**Избегать:**
```tsx
function Cart({ list, onRemoveProduct }: Props) {
  return (
    <ul>
      {list.map(({ id }) => (
        <li>
          <Button onClick={() => onRemoveProduct(id)}>Remove</Button>
        </li>
      ))}
    </ul>
  )
}
```

**Предпочтительно:**
```tsx
function Cart({ list, onRemoveProduct }: Props) {
  const handleRemoveProduct = (id: string) => () => {
    onRemoveProduct(id)
  }

  return (
    <ul>
      {list.map(({ id }) => (
        <li>
          <Button onClick={handleRemoveProduct(id)}>Remove</Button>
        </li>
      ))}
    </ul>
  )
}
```

### 10.2 Formatting Outside Component
**Избегать:**
```tsx
export function Card({ name, surname }: Props) {
  return (
    <Typography>{`${name} ${surname}`}</Typography>
  )
}
```

**Предпочтительно:**
```tsx
// В UI Store или utils
const formatFullName = (name: string, surname: string) => {
  return `${name} ${surname}`
}

export function Card({ name, surname }: Props) {
  const fullName = formatFullName(name, surname)
  
  return (
    <Typography>{fullName}</Typography>
  )
}
```

## 11. Module Exports

### 11.1 Direct Exports
**Избегать:**
```typescript
const API_URL = {}
class CartStore {}
function UserCard() {}

export {
  API_URL,
  CartStore,
  UserCard
}
```

**Предпочтительно:**
```typescript
export const API_URL = {}

export class CartStore {}

export function UserCard() {}
```

### 11.2 Index Files
**Принцип:** Использовать index.ts для реэкспорта
- Не импортировать из глубоких путей
- Использовать публичный API модуля

## 12. Lifecycle Management

### 12.1 useEffect with Stores
**Интеграция с MobX:**
```tsx
import { useLocalObservable } from 'mobx-react-lite'
import { createUIStore } from './ui-store'
import { useEffect } from 'react'

export function Card() {
  const { mount, unmount } = useLocalObservable(createUIStore)

  useEffect(() => {
    mount()
    return unmount
  }, [])

  return <Wrapper>...</Wrapper>
}
```

## 13. Стилизация

### 13.1 Цветовая тема "Якутский север"
**Палитра:**
- Ледяной голубой: `#E0F2F7`
- Северный синий: `#1E3A5F`
- Бирюза: `#4ECDC4`
- Снежный белый: `#FFFFFF`
- Фиолетовое сияние: `#9B59B6`

### 13.2 Подход к стилям
- CSS Modules или Styled Components
- Переменные для цветов (CSS Variables)
- Темная/светлая тема
- Адаптивный дизайн (mobile-first)

### 13.3 Компоненты UI
- Использование библиотеки компонентов (shadcn/ui, Material-UI)
- Кастомизация под тему "Якутский север"
- Консистентный дизайн

## 14. Обработка ошибок

### 14.1 Типы ошибок
- Ошибки сети
- Ошибки API (4xx, 5xx)
- Ошибки валидации
- Ошибки бизнес-логики

### 14.2 Обработка
- Error Boundaries для критических ошибок
- Toast-уведомления для пользователя
- Логирование ошибок
- Fallback UI для ошибок

## 15. Производительность

### 15.1 Оптимизация
- Code splitting — разделение кода
- Lazy loading — ленивая загрузка компонентов
- Memoization — мемоизация компонентов (React.memo, useMemo)
- Виртуализация списков — для больших списков

### 15.2 Кэширование
- React Query для кэширования API-запросов
- Локальное кэширование изображений
- Service Worker для офлайн-режима (будущее)

## 16. Доступность (Accessibility)

### 16.1 Принципы
- Семантический HTML
- ARIA-атрибуты
- Клавиатурная навигация
- Screen reader поддержка

### 16.2 Тестирование
- Автоматическое тестирование доступности
- Ручное тестирование с screen readers

## 17. Тестирование

### 17.1 Типы тестов
- Unit tests — тестирование компонентов
- Integration tests — тестирование взаимодействий
- E2E tests — тестирование полных сценариев

### 17.2 Инструменты
- Jest — unit тесты
- React Testing Library — тестирование компонентов
- Cypress / Playwright — E2E тесты

## 18. Интеграция с Backend

### 18.1 API Endpoints
Все запросы идут только к Backend API:
- `/api/routes` — маршруты
- `/api/auth` — авторизация
- `/api/orders` — заказы
- `/api/assistant` — помощник
- `/api/attractions` — достопримечательности
- `/api/events` — события

### 18.2 Аутентификация
- JWT токен в localStorage или httpOnly cookie
- Автоматическое обновление токена
- Редирект на login при истечении токена

### 18.3 Загрузка изображений
- Получение URL из Backend API
- Загрузка изображений напрямую из S3 (через URL)
- Кэширование изображений

## 19. Структура данных

### 19.1 Типы данных
```typescript
// Route
interface Route {
  id: string
  from: City
  to: City
  transport: TransportType
  duration: number
  price: Price
  departureTime: Date
  arrivalTime: Date
  mapData: MapData
}

// Assistant Response
interface AssistantResponse {
  message: string
  weather?: WeatherInfo
  risk?: RiskInfo
  facts?: string[]
  suggestions?: Suggestion[]
}

// Order
interface Order {
  id: string
  route: Route
  services: Service[]
  totalPrice: Price
  status: OrderStatus
  createdAt: Date
}
```

## 20. Особенности реализации

### 20.1 Карта
- Уникальная тема карты
- Цветные линии транспорта
- Интерактивные маркеры
- Масштабирование и панорамирование

### 20.2 Помощник (мамонтёнок)
- Анимированный аватар
- Диалоговый интерфейс
- Отображение погоды
- Предупреждения о рисках
- Интерактивные предложения

### 20.3 Адаптивность
- Mobile-first подход
- Responsive дизайн
- Оптимизация для планшетов и десктопов

## 21. Безопасность

### 21.1 Защита данных
- Не хранить чувствительные данные в localStorage
- Использовать httpOnly cookies для токенов (если возможно)
- Санитизация пользовательского ввода
- Защита от XSS

### 21.2 CORS
- Настройка CORS на Backend
- Правильные заголовки
- Защита от CSRF (будущее)

