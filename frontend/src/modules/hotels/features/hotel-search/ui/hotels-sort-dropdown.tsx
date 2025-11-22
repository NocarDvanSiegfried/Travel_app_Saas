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
        className="input flex items-center gap-sm"
      >
        <span>{sortLabels[sortOption]}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-sm dropdown min-w-xs z-50 fade-in">
          {(['price-desc', 'price-asc', 'rating'] as SortOption[]).map((option) => {
            const isActive = sortOption === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`dropdown-item ${isActive ? 'dropdown-item-active' : ''}`}
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

