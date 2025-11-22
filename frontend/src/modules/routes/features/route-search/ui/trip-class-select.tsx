'use client'

import { useState, useRef, useEffect } from 'react'

interface TripClassSelectProps {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

const TRIP_CLASSES = [
  { value: 'economy', label: 'Эконом' },
  { value: 'comfort', label: 'Комфорт' },
  { value: 'business', label: 'Бизнес' },
] as const

export function TripClassSelect({
  id,
  name,
  value,
  onChange,
  onKeyDown,
}: TripClassSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedClass = TRIP_CLASSES.find((cls) => cls.value === value) || TRIP_CLASSES[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    setHighlightedIndex(-1)
  }

  const handleSelect = (classValue: string) => {
    onChange(classValue)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isOpen && highlightedIndex >= 0) {
        handleSelect(TRIP_CLASSES[highlightedIndex].value)
      } else {
        handleToggle()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        setHighlightedIndex((prev) =>
          prev < TRIP_CLASSES.length - 1 ? prev + 1 : prev
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(-1)
    } else if (onKeyDown) {
      onKeyDown(e)
    }
  }

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label="Класс поездки"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="input cursor-pointer flex items-center justify-between"
      >
        <span className="text-primary">{selectedClass.label}</span>
        <span
          className={`inline-block text-secondary transition-fast ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          aria-label={isOpen ? 'Закрыть список' : 'Открыть список'}
          role="img"
        >
          ▼
        </span>
      </div>
      <input type="hidden" id={id} name={name} value={value} />
      {isOpen && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-[1000] w-full mt-xs max-h-60 overflow-auto rounded-sm shadow-sm border border-card-border bg-card-bg"
        >
          {TRIP_CLASSES.map((cls, index) => (
            <li
              key={cls.value}
              role="option"
              aria-selected={cls.value === value}
              onClick={() => handleSelect(cls.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect(cls.value)
                }
              }}
              tabIndex={0}
              className={`dropdown-item ${index === highlightedIndex || cls.value === value ? 'dropdown-item-active' : ''}`}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {cls.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

