'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useCities } from '@/shared/hooks/use-cities'
import type { City } from '@/shared/schemas/cities.schema'

interface CityAutocompleteProps {
  id: string
  name: string
  label: string
  placeholder: string
  value: string // cityId
  displayValue?: string // cityName для отображения
  onChange: (cityId: string, cityName: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  error?: string
  'aria-describedby'?: string
}

/**
 * Компонент автокомплита для выбора города
 * 
 * Предоставляет выпадающий список городов с фильтрацией по введенному тексту.
 * Поддерживает навигацию с клавиатуры (стрелки вверх/вниз, Enter, Escape).
 * Работает с объектами City (id, name) - отображает name, возвращает id.
 * 
 * @param props - Пропсы компонента
 * @param props.id - Уникальный идентификатор поля
 * @param props.name - Имя поля для формы
 * @param props.label - Текст метки поля
 * @param props.placeholder - Текст подсказки
 * @param props.value - Текущий cityId
 * @param props.displayValue - Текущее название города для отображения
 * @param props.onChange - Callback при изменении значения (cityId, cityName)
 * @param props.onKeyDown - Callback при нажатии клавиши (опционально)
 * @returns JSX элемент поля автокомплита
 */
export function CityAutocomplete({
  id,
  name,
  label,
  placeholder,
  value, // cityId
  displayValue, // cityName для отображения
  onChange,
  onKeyDown,
  error,
  'aria-describedby': ariaDescribedBy,
}: CityAutocompleteProps) {
  const { cities: citiesFromHook, isLoading: loading } = useCities()
  const [isOpen, setIsOpen] = useState(false)
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [inputValue, setInputValue] = useState(displayValue || '')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // КРИТИЧЕСКИЙ ФИКС: Стабилизируем availableCities через useMemo для предотвращения бесконечных обновлений
  const availableCities = useMemo(() => {
    return citiesFromHook || []
  }, [citiesFromHook?.map(c => c.id).join(',')])

  // Обновляем inputValue при изменении displayValue
  // КРИТИЧЕСКИЙ ФИКС: Используем useMemo для стабилизации cityNameFromId
  // и предотвращения бесконечных обновлений
  const cityNameFromId = useMemo(() => {
    if (value && availableCities.length > 0) {
      const city = availableCities.find(c => c.id === value)
      return city?.name || ''
    }
    return ''
  }, [value, availableCities.length > 0 ? availableCities.map(c => c.id).join(',') : ''])

  useEffect(() => {
    if (displayValue !== undefined) {
      setInputValue(displayValue)
    } else if (value && cityNameFromId) {
      setInputValue(cityNameFromId)
    } else if (!value) {
      setInputValue('')
    }
  }, [displayValue, value, cityNameFromId])

  useEffect(() => {
    if (loading || availableCities.length === 0) {
      setFilteredCities([])
      setIsOpen(false)
      return
    }

    const trimmedValue = inputValue?.trim() || ''
    if (trimmedValue.length > 0) {
      const exactMatch = availableCities.find(
        (c) => c.name.toLowerCase().trim() === trimmedValue.toLowerCase()
      )
      if (exactMatch) {
        setFilteredCities([])
        setIsOpen(false)
      } else {
        const valueLower = trimmedValue.toLowerCase()
        const filtered = availableCities.filter((city) => {
          const cityNameLower = city.name.toLowerCase().trim()
          return cityNameLower.length > 1 && cityNameLower.includes(valueLower) && city.name.trim().length > 1
        })
        const uniqueFiltered = Array.from(new Map(filtered.map(c => [c.id, c])).values())
        setFilteredCities(uniqueFiltered)
        setIsOpen(uniqueFiltered.length > 0)
      }
    } else {
      setFilteredCities([])
      setIsOpen(false)
    }
    setHighlightedIndex(-1)
  }, [inputValue, availableCities, loading])

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
    setInputValue(newValue)
    // При вводе текста очищаем cityId
    onChange('', newValue)
  }

  const handleInputFocus = () => {
    if (loading || availableCities.length === 0) {
      return
    }

    const trimmedValue = inputValue?.trim() || ''
    if (trimmedValue.length > 0) {
      const valueLower = trimmedValue.toLowerCase()
      const exactMatch = availableCities.find(
        (c) => c.name.toLowerCase().trim() === trimmedValue.toLowerCase()
      )
      if (exactMatch) {
        setFilteredCities([])
        setIsOpen(false)
      } else {
        const filtered = availableCities.filter((city) => {
          const cityNameLower = city.name.toLowerCase().trim()
          return cityNameLower.length > 0 && cityNameLower.includes(valueLower) && city.name.length > 1
        })
        const uniqueFiltered = Array.from(new Map(filtered.map(c => [c.id, c])).values())
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

    const trimmedValue = inputValue?.trim() || ''
    if (trimmedValue.length > 0) {
      const exactMatch = availableCities.find(
        (c) => c.name.toLowerCase().trim() === trimmedValue.toLowerCase()
      )
      if (exactMatch) {
        setFilteredCities([])
        setIsOpen(false)
      } else {
        const valueLower = trimmedValue.toLowerCase()
        const filtered = availableCities.filter((city) => {
          const cityNameLower = city.name.toLowerCase().trim()
          return cityNameLower.length > 1 && cityNameLower.includes(valueLower) && city.name.trim().length > 1
        })
        const uniqueFiltered = Array.from(new Map(filtered.map(c => [c.id, c])).values())
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

  const handleSelectCity = (city: City) => {
    if (city && city.id && city.name) {
      onChange(city.id, city.name)
      setInputValue(city.name)
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (isOpen && filteredCities.length > 0) {
        setHighlightedIndex((prev: number) => {
          const nextIndex = prev < filteredCities.length - 1 ? prev + 1 : prev
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
        if (highlightedIndex >= 0 && highlightedIndex < filteredCities.length && filteredCities[highlightedIndex]) {
          handleSelectCity(filteredCities[highlightedIndex])
        } else if (filteredCities.length === 1) {
          handleSelectCity(filteredCities[0])
        } else {
          const trimmedValue = inputValue?.trim() || ''
          const exactMatch = filteredCities.find(
            (city) => city.name.toLowerCase().trim() === trimmedValue.toLowerCase()
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
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input"
          data-testid={`city-autocomplete-${name}`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-listbox` : undefined}
          aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
          aria-haspopup="listbox"
          aria-owns={isOpen ? `${id}-listbox` : undefined}
          aria-describedby={error ? `${id}-error` : ariaDescribedBy}
          aria-invalid={error ? 'true' : 'false'}
        />
        {isOpen && filteredCities.filter((city) => city && city.id && city.name && city.name.trim().length > 1).length > 0 && (
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            className="dropdown-menu mt-xs"
            aria-label={`Список городов для ${label}`}
          >
            {filteredCities
              .filter((city) => city && city.id && city.name && city.name.trim().length > 1)
              .map((city: City, index: number) => {
                return (
                  <li
                    key={`${city.id}-${index}`}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    onClick={() => handleSelectCity(city)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectCity(city)
                      }
                    }}
                    tabIndex={-1}
                    className={`dropdown-item ${index === highlightedIndex ? 'dropdown-item-active' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {city.name}
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
