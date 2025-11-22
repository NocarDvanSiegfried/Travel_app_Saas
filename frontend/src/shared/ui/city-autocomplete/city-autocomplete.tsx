'use client'

import { useState, useRef, useEffect } from 'react'
import { useCities } from '@/shared/hooks/use-cities'

interface CityAutocompleteProps {
  id: string
  name: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  error?: string
  'aria-describedby'?: string
}

/**
 * Компонент автокомплита для выбора города
 * 
 * Предоставляет выпадающий список городов с фильтрацией по введенному тексту.
 * Поддерживает навигацию с клавиатуры (стрелки вверх/вниз, Enter, Escape).
 * 
 * @param props - Пропсы компонента
 * @param props.id - Уникальный идентификатор поля
 * @param props.name - Имя поля для формы
 * @param props.label - Текст метки поля
 * @param props.placeholder - Текст подсказки
 * @param props.value - Текущее значение поля
 * @param props.onChange - Callback при изменении значения
 * @param props.onKeyDown - Callback при нажатии клавиши (опционально)
 * @returns JSX элемент поля автокомплита
 */
export function CityAutocomplete({
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  onKeyDown,
  error,
  'aria-describedby': ariaDescribedBy,
}: CityAutocompleteProps) {
  const { cities: availableCities, isLoading: loading } = useCities()
  const [isOpen, setIsOpen] = useState(false)
  const [filteredCities, setFilteredCities] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loading || availableCities.length === 0) {
      setFilteredCities([])
      setIsOpen(false)
      return
    }

    const trimmedValue = value?.trim() || ''
    if (trimmedValue.length > 0) {
      const exactMatch = availableCities.find(
        (c) => c.toLowerCase().trim() === trimmedValue.toLowerCase()
      )
      if (exactMatch) {
        setFilteredCities([])
        setIsOpen(false)
      } else {
        const valueLower = trimmedValue.toLowerCase()
        const filtered = availableCities.filter((city) => {
          const cityLower = city.toLowerCase().trim()
          return cityLower.length > 1 && cityLower.includes(valueLower) && city.trim().length > 1
        })
        const uniqueFiltered = Array.from(new Set(filtered.map(c => c.trim()))).filter(c => c.length > 1)
        setFilteredCities(uniqueFiltered)
        setIsOpen(uniqueFiltered.length > 0)
      }
    } else {
      setFilteredCities([])
      setIsOpen(false)
    }
    setHighlightedIndex(-1)
  }, [value, availableCities, loading])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setFilteredCities([])
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  const handleInputFocus = () => {
    if (loading || availableCities.length === 0) {
      return
    }

    const trimmedValue = value?.trim() || ''
    if (trimmedValue.length > 0) {
      const valueLower = trimmedValue.toLowerCase()
      const exactMatch = availableCities.find(
        (c) => c.toLowerCase().trim() === trimmedValue.toLowerCase()
      )
      if (exactMatch) {
        setFilteredCities([])
        setIsOpen(false)
      } else {
        const filtered = availableCities.filter((city) => {
          const cityLower = city.toLowerCase().trim()
          return cityLower.length > 0 && cityLower.includes(valueLower) && city.length > 1
        })
        const uniqueFiltered = Array.from(new Set(filtered))
        setFilteredCities(uniqueFiltered)
        setIsOpen(uniqueFiltered.length > 0)
      }
    } else {
      setFilteredCities([])
      setIsOpen(false)
    }
    setHighlightedIndex(-1)
  }

  const handleInputClick = () => {
    if (loading || availableCities.length === 0) {
      return
    }

    const trimmedValue = value?.trim() || ''
    if (trimmedValue.length > 0) {
      const exactMatch = availableCities.find(
        (c) => c.toLowerCase().trim() === trimmedValue.toLowerCase()
      )
      if (exactMatch) {
        setFilteredCities([])
        setIsOpen(false)
      } else {
        const valueLower = trimmedValue.toLowerCase()
        const filtered = availableCities.filter((city) => {
          const cityLower = city.toLowerCase().trim()
          return cityLower.length > 1 && cityLower.includes(valueLower) && city.trim().length > 1
        })
        const uniqueFiltered = Array.from(new Set(filtered.map(c => c.trim()))).filter(c => c.length > 1)
        setFilteredCities(uniqueFiltered)
        setIsOpen(uniqueFiltered.length > 0)
      }
    } else {
      setFilteredCities([])
      setIsOpen(false)
    }
    setHighlightedIndex(-1)
  }

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false)
      setFilteredCities([])
      setHighlightedIndex(-1)
    }, 200)
  }

  const handleSelectCity = (city: string) => {
    // Проверяем, что город не пустой и существует в списке доступных городов
    const trimmedCity = city?.trim() || ''
    if (trimmedCity.length > 0) {
      // Проверяем, что город есть в списке (регистронезависимо)
      const cityExists = availableCities.some(
        (c) => c.toLowerCase().trim() === trimmedCity.toLowerCase()
      )
      if (cityExists) {
        // Находим точное совпадение из списка для корректного значения
        const exactCity = availableCities.find(
          (c) => c.toLowerCase().trim() === trimmedCity.toLowerCase()
        )
        if (exactCity) {
          onChange(exactCity)
          setIsOpen(false)
          inputRef.current?.blur()
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (isOpen && filteredCities.length > 0) {
        setHighlightedIndex((prev: number) => {
          const nextIndex = prev < filteredCities.length - 1 ? prev + 1 : prev
          // Скролл после обновления состояния
          setTimeout(() => {
            if (listRef.current && nextIndex >= 0) {
              const items = listRef.current.children
              if (items[nextIndex]) {
                items[nextIndex].scrollIntoView({ block: 'nearest' })
              }
            }
          }, 0)
          return nextIndex
        })
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        setHighlightedIndex((prev: number) => {
          const prevIndex = prev > 0 ? prev - 1 : -1
          // Скролл после обновления состояния
          setTimeout(() => {
            if (listRef.current && prevIndex >= 0) {
              const items = listRef.current.children
              if (items[prevIndex]) {
                items[prevIndex].scrollIntoView({ block: 'nearest' })
              }
            }
          }, 0)
          return prevIndex
        })
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && filteredCities.length > 0) {
        // Если есть выделенный элемент, выбираем его
        if (highlightedIndex >= 0 && highlightedIndex < filteredCities.length && filteredCities[highlightedIndex]) {
          handleSelectCity(filteredCities[highlightedIndex])
        } else if (filteredCities.length === 1) {
          // Если только один результат, выбираем его
          handleSelectCity(filteredCities[0])
        } else {
          // Проверяем точное совпадение
          const trimmedValue = value?.trim() || ''
          const exactMatch = filteredCities.find(
            (city) => city.toLowerCase().trim() === trimmedValue.toLowerCase()
          )
          if (exactMatch) {
            handleSelectCity(exactMatch)
          } else if (onKeyDown) {
            onKeyDown(e)
          }
        }
      } else if (onKeyDown) {
        onKeyDown(e)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(-1)
    } else if (onKeyDown) {
      onKeyDown(e)
    }
  }

  return (
    <div className="space-y-xs relative z-10" ref={containerRef}>
      <label
        htmlFor={id}
        className="block text-xs font-normal text-left text-secondary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-listbox` : undefined}
          aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
          aria-haspopup="listbox"
          aria-owns={isOpen ? `${id}-listbox` : undefined}
          aria-describedby={error ? `${id}-error` : ariaDescribedBy}
          aria-invalid={error ? 'true' : 'false'}
        />
        {isOpen && filteredCities.filter((city) => city && typeof city === 'string' && city.trim().length > 1).length > 0 && (
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            className="dropdown-menu mt-xs"
            aria-label={`Список городов для ${label}`}
          >
            {filteredCities
              .filter((city) => city && typeof city === 'string' && city.trim().length > 1)
              .map((city: string, index: number) => {
                const trimmedCity = city.trim()
                return (
                  <li
                    key={`${trimmedCity}-${index}`}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    onClick={() => handleSelectCity(trimmedCity)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectCity(trimmedCity)
                      }
                    }}
                    tabIndex={-1}
                    className={`dropdown-item ${index === highlightedIndex ? 'dropdown-item-active' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {trimmedCity}
                  </li>
                )
              })}
          </ul>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm mt-xs text-error" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}

