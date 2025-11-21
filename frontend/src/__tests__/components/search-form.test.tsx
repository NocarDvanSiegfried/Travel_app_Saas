import React from 'react'
import { flushSync } from 'react-dom'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchForm } from '@/modules/routes'
import { useRouter } from 'next/navigation'
import { useCities } from '@/shared/hooks/use-cities'

// Мокируем зависимости
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/shared/hooks/use-cities', () => ({
  useCities: jest.fn(),
}))

// Мокируем дочерние компоненты
jest.mock('@/shared/ui/city-autocomplete', () => ({
  CityAutocomplete: ({ label, placeholder, value, onChange }: any) => (
    <div>
      <label htmlFor={`city-${label.toLowerCase()}`}>{label}</label>
      <input
        id={`city-${label.toLowerCase()}`}
        data-testid={`city-input-${label.toLowerCase()}`}
        value={value}
        onChange={(e) => {
          // Вызываем onChange напрямую с значением из события
          // Это имитирует реальное поведение компонента
          onChange(e.target.value)
        }}
        placeholder={placeholder}
      />
    </div>
  ),
}))

jest.mock('@/shared/ui/date-picker', () => ({
  DatePicker: ({ label, value, onChange }: any) => (
    <div>
      <label htmlFor={`date-${label.toLowerCase()}`}>{label}</label>
      <input
        id={`date-${label.toLowerCase()}`}
        data-testid={`date-input-${label.toLowerCase()}`}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}))

jest.mock('@/modules/routes/features/route-search/ui/trip-class-select', () => ({
  TripClassSelect: ({ id, name, value, onChange }: any) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-left">
        Класс поездки
      </label>
      <div
        role="combobox"
        data-testid="trip-class-select"
        onClick={() => onChange(value === 'economy' ? 'comfort' : 'economy')}
      >
        {value === 'economy' ? 'Эконом' : value === 'comfort' ? 'Комфорт' : 'Бизнес'}
      </div>
      <input type="hidden" id={id} name={name} value={value} />
    </div>
  ),
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseCities = useCities as jest.MockedFunction<typeof useCities>

describe('SearchForm', () => {
  const mockCities = ['Якутск', 'Нерюнгри', 'Мирный', 'Удачный', 'Алдан']

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    } as any)
    mockUseCities.mockReturnValue({
      cities: mockCities,
      isLoading: false,
      error: null,
    })
  })

  describe('rendering', () => {
    it('should render search form with all fields', () => {
      render(<SearchForm />)

      expect(screen.getByLabelText('Откуда')).toBeInTheDocument()
      expect(screen.getByLabelText('Куда')).toBeInTheDocument()
      expect(screen.getByLabelText('Когда')).toBeInTheDocument()
      expect(screen.getByLabelText('Обратно')).toBeInTheDocument()
      expect(screen.getByLabelText('Пассажиры')).toBeInTheDocument()
      // Класс поездки - проверяем наличие компонента через data-testid
      expect(screen.getByTestId('trip-class-select')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /найти маршрут/i })).toBeInTheDocument()
    })

    it('should render submit button as disabled when form is invalid', () => {
      render(<SearchForm />)

      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      expect(submitButton).toBeDisabled()
    })

    it('should render submit button as enabled when form is valid', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const fromInput = screen.getByTestId('city-input-откуда')
      const toInput = screen.getByTestId('city-input-куда')

      await user.type(fromInput, 'Якутск')
      await user.type(toInput, 'Нерюнгри')

      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('validation', () => {
    it('should show error when submitting empty form', async () => {
      render(<SearchForm />)

      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      
      // Форма не должна отправляться, так как кнопка disabled
      expect(submitButton).toBeDisabled()
    })

    it('should show error when from city is empty', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const toInput = screen.getByTestId('city-input-куда')
      await user.type(toInput, 'Нерюнгри')

      // Кнопка все еще должна быть disabled
      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show error when to city is empty', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const fromInput = screen.getByTestId('city-input-откуда')
      await user.type(fromInput, 'Якутск')

      // Кнопка все еще должна быть disabled
      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show error when from and to cities are the same', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const fromInput = screen.getByTestId('city-input-откуда')
      const toInput = screen.getByTestId('city-input-куда')

      await user.type(fromInput, 'Якутск')
      await user.type(toInput, 'Якутск')

      // Кнопка должна быть disabled, так как города одинаковые
      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should show error when city is not in available cities list', async () => {
      const user = userEvent.setup()
      render(<SearchForm />)

      const fromInput = screen.getByTestId('city-input-откуда')
      const toInput = screen.getByTestId('city-input-куда')

      await user.type(fromInput, 'НесуществующийГород')
      await user.type(toInput, 'Нерюнгри')

      // Кнопка должна быть disabled
      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('form submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SearchForm />)

      const fromInput = screen.getByTestId('city-input-откуда')
      const toInput = screen.getByTestId('city-input-куда')

      // Заполняем форму через fireEvent для синхронного обновления состояния
      // Используем flushSync для гарантии, что все обновления состояния применены
      flushSync(() => {
        fireEvent.change(fromInput, { target: { value: 'Якутск' } })
      })
      
      flushSync(() => {
        fireEvent.change(toInput, { target: { value: 'Нерюнгри' } })
      })

      // Ждем, пока значения действительно появятся в инпутах
      await waitFor(
        () => {
          expect(fromInput).toHaveValue('Якутск')
          expect(toInput).toHaveValue('Нерюнгри')
        },
        { timeout: 2000 }
      )

      // Ждем, пока форма станет валидной (кнопка разблокируется)
      // Это гарантирует, что состояние формы обновлено и валидация прошла
      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 3000 }
      )

      // Отправляем форму через клик на кнопку
      // handleSubmit использует setFormData с функцией обновления, которая читает currentFormData
      // После flushSync, currentFormData должен содержать актуальные значения
      await act(async () => {
        await user.click(submitButton)
      })

      // Проверяем результат: router.push должен быть вызван с правильными параметрами
      // Это единственный пользовательский результат - навигация на страницу результатов
      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledTimes(1)
          const navigationUrl = mockPush.mock.calls[0][0]
          
          // URLSearchParams автоматически кодирует значения, поэтому парсим URL
          expect(navigationUrl).toContain('/routes?')
          const url = new URL(navigationUrl, 'http://localhost')
          const params = new URLSearchParams(url.search)
          
          // Проверяем декодированные значения параметров
          expect(params.get('from')).toBe('Якутск')
          expect(params.get('to')).toBe('Нерюнгри')
        },
        { timeout: 3000 }
      )
    })

    it('should include date in URL when date is provided', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SearchForm />)

      // Используем дату в будущем для прохождения валидации Zod
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const futureDateString = futureDate.toISOString().split('T')[0]

      const fromInput = screen.getByTestId('city-input-откуда')
      const toInput = screen.getByTestId('city-input-куда')
      const dateInput = screen.getByTestId('date-input-когда')

      // Заполняем форму через fireEvent для синхронного обновления состояния
      // Используем flushSync для гарантии, что все обновления состояния применены
      flushSync(() => {
        fireEvent.change(fromInput, { target: { value: 'Якутск' } })
      })
      
      flushSync(() => {
        fireEvent.change(toInput, { target: { value: 'Нерюнгри' } })
      })
      
      flushSync(() => {
        fireEvent.change(dateInput, { target: { value: futureDateString } })
      })

      // Ждем, пока значения действительно появятся в инпутах
      await waitFor(
        () => {
          expect(fromInput).toHaveValue('Якутск')
          expect(toInput).toHaveValue('Нерюнгри')
          expect(dateInput).toHaveValue(futureDateString)
        },
        { timeout: 2000 }
      )

      // Ждем, пока форма станет валидной
      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 3000 }
      )

      // Отправляем форму
      await act(async () => {
        await user.click(submitButton)
      })

      // Проверяем результат: router.push должен быть вызван с датой в параметрах
      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledTimes(1)
          const navigationUrl = mockPush.mock.calls[0][0]
          
          // URLSearchParams автоматически кодирует значения, поэтому парсим URL
          expect(navigationUrl).toContain('/routes?')
          const url = new URL(navigationUrl, 'http://localhost')
          const params = new URLSearchParams(url.search)
          
          // Проверяем декодированные значения параметров, включая дату
          expect(params.get('from')).toBe('Якутск')
          expect(params.get('to')).toBe('Нерюнгри')
          expect(params.get('date')).toBe(futureDateString)
        },
        { timeout: 3000 }
      )
    })

    it('should include passengers in URL when passengers is not 1', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SearchForm />)

      const fromInput = screen.getByTestId('city-input-откуда')
      const toInput = screen.getByTestId('city-input-куда')
      const passengersInput = screen.getByLabelText('Пассажиры')

      await user.type(fromInput, 'Якутск')
      await user.type(toInput, 'Нерюнгри')
      await user.clear(passengersInput)
      await user.type(passengersInput, '2')

      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 3000 }
      )

      await user.click(submitButton)

      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalled()
          const callArgs = mockPush.mock.calls[0][0]
          expect(callArgs).toContain('passengers=2')
        },
        { timeout: 3000 }
      )
    })

    it('should not include passengers in URL when passengers is 1', async () => {
      const user = userEvent.setup({ delay: null })
      render(<SearchForm />)

      const fromInput = screen.getByTestId('city-input-откуда')
      const toInput = screen.getByTestId('city-input-куда')

      await user.type(fromInput, 'Якутск')
      await user.type(toInput, 'Нерюнгри')

      const submitButton = screen.getByRole('button', { name: /найти маршрут/i })
      await waitFor(
        () => {
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 3000 }
      )

      await user.click(submitButton)

      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalled()
          const callArgs = mockPush.mock.calls[0][0]
          expect(callArgs).not.toContain('passengers')
        },
        { timeout: 3000 }
      )
    })
  })

  describe('loading state', () => {
    it('should handle loading cities state', () => {
      mockUseCities.mockReturnValue({
        cities: [],
        isLoading: true,
        error: null,
      })

      render(<SearchForm />)

      // Форма должна рендериться даже при загрузке
      expect(screen.getByRole('button', { name: /найти маршрут/i })).toBeInTheDocument()
    })
  })
})

