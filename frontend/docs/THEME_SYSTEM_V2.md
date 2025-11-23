# Theme System v2 - Полная система токенов

**Дата:** 2025-01-XX  
**Статус:** ✅ Создана и интегрирована

---

## 🎯 Цель

Создать полноценную, структурированную, масштабируемую систему токенов для всего проекта, полностью совместимую со стилем Skyscanner.

---

## 📋 Структура токенов

### 1. Основные цвета

```css
--color-primary: #0d6efd;
--color-primary-hover: #0b5ed7;
--color-primary-active: #0a58ca;
--color-primary-light: #e7f1ff;
--color-primary-dark: #0a58ca;

--color-accent: #00a698;
--color-accent-hover: #008578;
--color-accent-light: rgba(0, 166, 152, 0.1);
```

**Использование в Tailwind:**
- `bg-primary`, `bg-primary-hover`, `bg-primary-active`
- `text-primary`, `text-primary-light`
- `bg-accent`, `bg-accent-hover`, `bg-accent-light`

### 2. Поверхности

```css
--color-background: #ffffff;
--color-background-subtle: #f8f9fa;

--color-surface: #ffffff;
--color-surface-alt: #f8f9fa;
--color-surface-hover: #f1f3f5;

--color-dark-zone: #0d47a1;
--color-dark-zone-alt: #0a3d8a;
--color-dark-zone-border: rgba(255, 255, 255, 0.15);
--color-dark-zone-text: #ffffff;
--color-dark-zone-text-secondary: rgba(255, 255, 255, 0.85);
--color-dark-zone-text-tertiary: rgba(255, 255, 255, 0.6);
--color-dark-zone-hover: rgba(255, 255, 255, 0.1);
```

**Использование в Tailwind:**
- `bg-background`, `bg-background-subtle`
- `bg-surface`, `bg-surface-alt`, `bg-surface-hover`
- `bg-dark-zone`, `bg-dark-zone-alt`
- `text-dark-zone-text`, `text-dark-zone-text-secondary`

### 3. Текст

```css
--color-text-primary: #1a1a1a;
--color-text-secondary: #6b7280;
--color-text-muted: #9ca3af;
--color-text-tertiary: #9ca3af;
--color-text-inverse: #ffffff;
--color-text-heading: #1e40af;
```

**Использование в Tailwind:**
- `text-primary`, `text-secondary`, `text-muted`
- `text-tertiary`, `text-inverse`, `text-heading`

### 4. Границы

```css
--color-border-light: #e9ecef;
--color-border-medium: #d1d5db;
--color-border-dark: #9ca3af;
--color-border: #e5e7eb;
--color-border-hover: #d1d5db;
--color-divider: #e9ecef;
```

**Использование в Tailwind:**
- `border-light`, `border-medium`, `border-dark`
- `border`, `border-hover`
- `border-divider`

### 5. Состояния

```css
--color-success: #00a698;
--color-success-light: rgba(0, 166, 152, 0.1);

--color-warning: #ffc107;
--color-warning-light: rgba(255, 193, 7, 0.1);

--color-error: #dc3545;
--color-error-light: rgba(220, 53, 69, 0.1);

--color-danger: #dc3545;
--color-danger-light: rgba(220, 53, 69, 0.1);

--color-info: #0d6efd;
--color-info-light: rgba(13, 110, 253, 0.1);
```

**Использование в Tailwind:**
- `bg-success`, `bg-success-light`
- `bg-warning`, `bg-warning-light`
- `bg-error`, `bg-error-light`
- `bg-danger`, `bg-danger-light`
- `bg-info`, `bg-info-light`

### 6. Инпуты

```css
/* Светлые инпуты */
--color-input-bg: #ffffff;
--color-input-border: #d1d5db;
--color-input-border-focus: #0d6efd;
--color-input-placeholder: #9ca3af;
--color-input-text: #1a1a1a;

/* Тёмные инпуты */
--color-input-bg-dark: rgba(255, 255, 255, 0.1);
--color-input-border-dark: rgba(255, 255, 255, 0.2);
--color-input-border-focus-dark: rgba(255, 255, 255, 0.4);
--color-input-placeholder-dark: rgba(255, 255, 255, 0.5);
--color-input-text-dark: #ffffff;
```

**Использование в Tailwind:**
- `bg-input-bg`, `border-input-border`
- `bg-input-bg-dark`, `border-input-border-dark`

### 7. Карточки

```css
--color-card-bg: #ffffff;
--color-card-border: #e9ecef;
```

**Использование в Tailwind:**
- `bg-card-bg`, `border-card-border`

### 8. Header/Footer

```css
--color-header-bg: var(--color-dark-zone);
--color-header-border: rgba(255, 255, 255, 0.1);
--color-header-text: var(--color-dark-zone-text);
--color-header-text-secondary: var(--color-dark-zone-text-secondary);
--color-header-text-tertiary: var(--color-dark-zone-text-tertiary);
--color-header-hover: var(--color-dark-zone-hover);
```

**Использование в Tailwind:**
- `bg-header-bg`, `border-header-border`
- `text-header-text`, `text-header-text-secondary`

### 9. Тени

```css
--shadow-xs: 0 0.5px 1px 0 rgba(0, 0, 0, 0.01);
--shadow-sm: 0 1px 1px 0 rgba(0, 0, 0, 0.02);
--shadow-md: 0 1px 3px 0 rgba(0, 0, 0, 0.03);
--shadow-lg: 0 2px 4px 0 rgba(0, 0, 0, 0.04);
--shadow-xl: 0 4px 8px 0 rgba(0, 0, 0, 0.05);
```

**Использование в Tailwind:**
- `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`

### 10. Радиусы

```css
--radius-sm: 3px;
--radius-md: 4px;
--radius-lg: 6px;
--radius-xl: 8px;
--radius-full: 9999px;
```

**Использование в Tailwind:**
- `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`

### 11. Отступы

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;
--spacing-2xl: 32px;
--spacing-3xl: 48px;
```

**Использование в Tailwind:**
- `p-xs`, `p-sm`, `p-md`, `p-lg`, `p-xl`, `p-2xl`, `p-3xl`
- `m-xs`, `m-sm`, `m-md`, `m-lg`, `m-xl`, `m-2xl`, `m-3xl`

### 12. Типографика

#### Размеры шрифтов

```css
--font-xs: 12px;
--font-sm: 14px;
--font-md: 15px;
--font-lg: 17px;
--font-xl: 19px;
```

**Использование в Tailwind:**
- `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`

#### Веса шрифтов

```css
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Использование в Tailwind:**
- `font-regular`, `font-medium`, `font-semibold`, `font-bold`

#### Межстрочные интервалы

```css
--leading-tight: 1.3;
--leading-normal: 1.5;
--leading-relaxed: 1.7;
```

**Использование в Tailwind:**
- `leading-tight`, `leading-normal`, `leading-relaxed`

### 13. Переходы

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

**Использование в Tailwind:**
- `transition-fast`, `transition-base`, `transition-slow`

---

## ✅ Интеграция с Tailwind

Все токены доступны через `theme.extend` в `tailwind.config.js`:

- **Colors**: `bg-primary`, `text-secondary`, `border-light`, и т.д.
- **Spacing**: `p-xs`, `m-md`, `gap-lg`, и т.д.
- **Radii**: `rounded-sm`, `rounded-md`, `rounded-lg`, и т.д.
- **Shadows**: `shadow-xs`, `shadow-sm`, `shadow-md`, и т.д.
- **FontSize**: `text-xs`, `text-sm`, `text-base`, и т.д.
- **FontWeight**: `font-regular`, `font-medium`, `font-semibold`, и т.д.
- **LineHeight**: `leading-tight`, `leading-normal`, `leading-relaxed`

---

## 📊 Преимущества Theme System v2

1. **Единая палитра** — все цвета через токены
2. **Единая типографика** — системные размеры и веса
3. **Единые тени** — от `xs` до `xl`
4. **Единые радиусы** — от `sm` до `full`
5. **Единые состояния** — success, warning, error, danger, info
6. **Корректная работа в CSS и Tailwind** — все токены доступны в обоих
7. **Отсутствие конфликтов** — семантические токены
8. **Отсутствие хардкодов** — все через переменные

---

## 🎯 Следующие шаги

После создания Theme System v2 необходимо:

1. Применить токены ко всем компонентам
2. Заменить локальные классы на системные токены
3. Удалить устаревшие локальные цвета
4. Унифицировать отступы
5. Привести инпуты, карточки, кнопки, заголовки к системным токенам

---

## ✅ Заключение

Theme System v2 создана и интегрирована в проект. Все токены доступны как в CSS (`var(--token)`), так и в Tailwind (`bg-primary`, `text-secondary`, и т.д.).

**Система готова к использованию во всём проекте.**





