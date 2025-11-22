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
        className="input flex items-center gap-2"
      >
        <span>{sortLabels[sortOption]}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 card p-2 min-w-[200px] z-50 fade-in">
          {(['price-desc', 'price-asc', 'rating'] as SortOption[]).map((option) => {
            const isActive = sortOption === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-4 py-2 rounded-sm transition-fast text-sm ${
                  isActive 
                    ? 'bg-primary text-inverse' 
                    : 'text-primary hover:bg-surface-hover'
                }`}
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

