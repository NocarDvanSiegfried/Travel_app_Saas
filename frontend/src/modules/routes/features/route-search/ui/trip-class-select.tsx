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
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 rounded-yakutia focus:ring-2 focus:ring-white/20 outline-none yakutia-transition shadow-sm border cursor-pointer"
        style={{
          color: 'var(--color-text-light)',
          backgroundColor: 'var(--color-input-bg)',
          borderColor: 'var(--color-input-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <span>{selectedClass.label}</span>
          <span
            className="yakutia-transition"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
        </div>
      </div>
      <input type="hidden" id={id} name={name} value={value} />
      {isOpen && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-[1000] w-full mt-1 max-h-60 overflow-auto rounded-yakutia shadow-lg border"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            borderColor: 'var(--color-card-border)',
            backdropFilter: 'blur(10px)',
            top: 'calc(100% + 4px)',
          }}
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
              className={`px-4 py-2 cursor-pointer yakutia-transition ${
                index === highlightedIndex || cls.value === value
                  ? 'opacity-90'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor:
                  index === highlightedIndex || cls.value === value
                    ? 'var(--color-primary)'
                    : 'transparent',
                color: 'var(--color-text-light)',
              }}
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

