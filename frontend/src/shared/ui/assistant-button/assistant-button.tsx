'use client'

import { memo } from 'react'
import { MammothIcon } from '@/shared/icons'

export const AssistantButton = memo(function AssistantButton() {
  return (
    <button
      className="fixed bottom-lg right-lg z-50 w-3xl h-3xl rounded-full flex items-center justify-center shadow-sm hover:shadow-sm transition-fast btn-icon btn-assistant"
      aria-label="Помощник мамонтёнок"
    >
      <MammothIcon 
        className="w-logo h-logo" 
        color="var(--color-text-inverse)"
      />
    </button>
  )
})

