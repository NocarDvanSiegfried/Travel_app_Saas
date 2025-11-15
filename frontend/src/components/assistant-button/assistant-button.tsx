'use client'

import { useState } from 'react'
import { MammothIcon } from '@/shared/icons'

export function AssistantButton() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      className={`
        fixed bottom-6 right-6 w-[70px] h-[70px] rounded-full
        bg-[#13b5c9] hover:bg-[#0fa5b8]
        flex items-center justify-center
        yakutia-glow yakutia-transition z-50
        ${isHovered ? 'scale-110' : 'scale-100'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Помощник мамонтёнок"
      style={{ position: 'fixed' }}
    >
      <MammothIcon 
        className="w-10 h-10 yakutia-bounce" 
        color="#FFFFFF"
      />
    </button>
  )
}

