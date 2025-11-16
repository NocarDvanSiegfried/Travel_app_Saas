'use client'

import { useState } from 'react'
import { MammothIcon } from '@/shared/icons'

export function AssistantButton() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      className={`
        fixed bottom-6 right-6 w-[70px] h-[70px] rounded-full
        flex items-center justify-center
        yakutia-glow yakutia-transition z-50
        shadow-lg
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
        className="w-10 h-10 yakutia-bounce" 
        color="#FFFFFF"
      />
    </button>
  )
}

