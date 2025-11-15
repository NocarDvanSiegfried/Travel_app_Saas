'use client'

import React from 'react'

type MammothIconProps = {
  className?: string
  color?: string
}

export function MammothIcon({ className = 'w-5 h-5', color = 'currentColor' }: MammothIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Улучшенная иконка мамонта */}
      <path d="M12 3c-3 0-5 2-5 5v9c0 2 2 4 5 4s5-2 5-4V8c0-3-2-5-5-5z" />
      <path d="M7 8h10M9 12h6" />
      <path d="M7 3l3-1M17 3l-3-1" />
      <path d="M7 3l1 2M17 3l-1 2" />
      <circle cx="10" cy="6" r="1" fill={color} />
      <circle cx="14" cy="6" r="1" fill={color} />
      <path d="M12 18v2" />
    </svg>
  )
}

