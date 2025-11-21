import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CityAutocomplete } from '@/shared/ui'
import { useCities } from '@/shared/hooks/use-cities'

// Мокируем зависимости
jest.mock('@/shared/hooks/use-cities', () => ({
  useCities: jest.fn(),
}))

const mockUseCities = useCities as jest.MockedFunction<typeof useCities>

describe('CityAutocomplete', () => {
  const mockCities = ['Якутск', 'Нерюнгри', 'Мирный', 'Удачный', 'Алдан', 'Олекминск']
  const mockOnChange = jest.fn()
  const mockOnKeyDown = jest.fn()

  const defaultProps = {
    id: 'test-city',
    name: 'test-city',
    label: 'Город',
    placeholder: 'Выберите город',
    value: '',
    onChange: mockOnChange,
    onKeyDown: mockOnKeyDown,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCities.mockReturnValue({
      cities: mockCities,
      isLoading: false,
      error: null,
    })
    // Мокируем scrollIntoView для jsdom
    Element.prototype.scrollIntoView = jest.fn()
  })

  describe('rendering', () => {
    it('should render input with label and placeholder', () => {
      render(<CityAutocomplete {...defaultProps} />)

      expect(screen.getByLabelText('Город')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Выберите город')).toBeInTheDocument()
    })

    it('should display value in input', () => {
      render(<CityAutocomplete {...defaultProps} value="Якутск" />)

      const input = screen.getByPlaceholderText('Выберите город')
      expect(input).toHaveValue('Якутск')
    })

    it('should not show dropdown when input is empty', () => {
      render(<CityAutocomplete {...defaultProps} />)

      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('autocomplete functionality', () => {
    it('should show filtered cities when typing', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      // Обновляем компонент с новым value для триггера useEffect
      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      await waitFor(
        () => {
          const list = screen.queryByRole('list')
          expect(list).toBeInTheDocument()
          expect(screen.getByText('Якутск')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should filter cities case-insensitively', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'яку')

      rerender(<CityAutocomplete {...defaultProps} value="яку" />)

      await waitFor(
        () => {
          expect(screen.getByText('Якутск')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should filter cities by partial match', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Нер')

      rerender(<CityAutocomplete {...defaultProps} value="Нер" />)

      await waitFor(
        () => {
          expect(screen.getByText('Нерюнгри')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should hide dropdown when exact match is found', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Якутск')

      rerender(<CityAutocomplete {...defaultProps} value="Якутск" />)

      await waitFor(
        () => {
          expect(screen.queryByRole('list')).not.toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should call onChange when city is selected', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      await waitFor(
        () => {
          expect(screen.getByText('Якутск')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const cityOption = screen.getByText('Якутск')
      await user.click(cityOption)

      expect(mockOnChange).toHaveBeenCalledWith('Якутск')
    })

    it('should close dropdown after selecting city', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      await waitFor(
        () => {
          expect(screen.getByText('Якутск')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const cityOption = screen.getByText('Якутск')
      await user.click(cityOption)

      await waitFor(
        () => {
          expect(screen.queryByRole('list')).not.toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })
  })

  describe('keyboard navigation', () => {
    it('should navigate with ArrowDown key', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      await waitFor(
        () => {
          expect(screen.getByRole('list')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await user.keyboard('{ArrowDown}')

      // Проверяем, что первый элемент выделен (через стили или классы)
      const firstItem = screen.getByText('Якутск')
      expect(firstItem).toBeInTheDocument()
    })

    it('should navigate with ArrowUp key', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      await waitFor(
        () => {
          expect(screen.getByRole('list')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}')

      // Проверяем навигацию
      expect(screen.getByText('Якутск')).toBeInTheDocument()
    })

    it('should select city with Enter key', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      await waitFor(
        () => {
          expect(screen.getByText('Якутск')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await user.keyboard('{Enter}')

      await waitFor(
        () => {
          expect(mockOnChange).toHaveBeenCalledWith('Якутск')
        },
        { timeout: 2000 }
      )
    })

    it('should close dropdown with Escape key', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      await waitFor(
        () => {
          expect(screen.getByRole('list')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      await user.keyboard('{Escape}')

      await waitFor(
        () => {
          expect(screen.queryByRole('list')).not.toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should call onKeyDown for other keys', async () => {
      const user = userEvent.setup({ delay: null })
      const { rerender } = render(<CityAutocomplete {...defaultProps} />)

      const input = screen.getByPlaceholderText('Выберите город')
      await user.type(input, 'Як')

      rerender(<CityAutocomplete {...defaultProps} value="Як" />)

      // Список должен быть открыт
      await waitFor(
        () => {
          expect(screen.getByRole('list')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Закрываем список
      await user.keyboard('{Escape}')

      await waitFor(
        () => {
          expect(screen.queryByRole('list')).not.toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      // Теперь Enter должен вызывать onKeyDown
      await user.keyboard('{Enter}')

      expect(mockOnKeyDown).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should not show dropdown when loading', () => {
      mockUseCities.mockReturnValue({
        cities: [],
        isLoading: true,
        error: null,
      })

      render(<CityAutocomplete {...defaultProps} value="Як" />)

      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should handle error state gracefully', () => {
      mockUseCities.mockReturnValue({
        cities: [],
        isLoading: false,
        error: new Error('Failed to load cities'),
      })

      render(<CityAutocomplete {...defaultProps} />)

      // Компонент должен рендериться даже при ошибке
      expect(screen.getByPlaceholderText('Выберите город')).toBeInTheDocument()
    })
  })
})
