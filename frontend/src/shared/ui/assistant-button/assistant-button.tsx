'use client'

import { useState } from 'react'
import { MammothIcon } from '@/shared/icons'

export function AssistantButton() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      className={`
        fixed bottom-6 right-6 w-14 h-14 rounded-full
        flex items-center justify-center
        transition-fast z-50
        shadow-sm hover:shadow-md
        ${isHovered ? 'scale-110' : 'scale-100'}
      `}
      style={{ backgroundColor: 'var(--color-primary)' }}
      onMouseEnter={(e) => {
        setIsHovered(true)
        e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        e.currentTarget.style.backgroundColor = 'var(--color-primary)'
      }}
      aria-label="Помощник мамонтёнок"
    >
      <MammothIcon 
        className="w-8 h-8" 
        color="var(--color-text-inverse)"
      />
    </button>
  )
}

