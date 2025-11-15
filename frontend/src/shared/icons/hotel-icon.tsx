'use client'

import React from 'react'

type HotelIconProps = {
  className?: string
  color?: string
}

export function HotelIcon({ className = 'w-5 h-5', color = 'currentColor' }: HotelIconProps) {
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
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
      <path d="M9 9v0M9 12v0M9 15v0M9 18v0" />
    </svg>
  )
}

