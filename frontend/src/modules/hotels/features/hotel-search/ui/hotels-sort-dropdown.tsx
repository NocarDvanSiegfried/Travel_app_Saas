'use client'

import { useState, useRef, useEffect } from 'react'
import { SortOption } from '@/modules/hotels/domain'

interface HotelsSortDropdownProps {
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
}

export function HotelsSortDropdown({ sortOption, onSortChange }: HotelsSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const sortLabels: Record<SortOption, string> = {
    rating: 'По рейтингу',
    'price-desc': 'По убыванию цены',
    'price-asc': 'По возрастанию цены',
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (option: SortOption) => {
    if (option !== sortOption) {
      onSortChange(option)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded-yakutia yakutia-transition font-medium text-sm border flex items-center gap-2"
        style={{
          backgroundColor: 'var(--color-input-bg)',
          color: 'var(--color-text-light)',
          borderColor: 'var(--color-input-border)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-card-bg)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-input-bg)'
        }}
      >
        <span>{sortLabels[sortOption]}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 yakutia-card p-2 min-w-[200px] z-50 fade-in">
          {(['price-desc', 'price-asc', 'rating'] as SortOption[]).map((option) => {
            const isActive = sortOption === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full text-left px-4 py-2 rounded-yakutia yakutia-transition text-sm"
                style={{
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--color-text-dark)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-card-bg)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {sortLabels[option]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

