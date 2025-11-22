'use client'

import { useRef } from 'react'

interface DatePickerProps {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  error?: string
  'aria-describedby'?: string
}

export function DatePicker({
  id,
  name,
  label,
  value,
  onChange,
  onKeyDown,
  error,
  'aria-describedby': ariaDescribedBy,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputClick = () => {
    inputRef.current?.showPicker?.()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onKeyDown) {
      onKeyDown(e)
    }
  }

  // Минимальная дата - сегодня
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-xs">
      <label
        htmlFor={id}
        className="block text-xs font-normal text-left text-secondary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          min={today}
          className="input"
          aria-describedby={error ? `${id}-error` : ariaDescribedBy}
          aria-invalid={error ? 'true' : 'false'}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm mt-xs text-error" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}

