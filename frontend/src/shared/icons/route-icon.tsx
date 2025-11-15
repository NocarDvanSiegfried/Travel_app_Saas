'use client'

import React from 'react'

type RouteIconProps = {
  className?: string
  color?: string
}

export function RouteIcon({ className = 'w-5 h-5', color = 'currentColor' }: RouteIconProps) {
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
      <path d="M3 12h18M3 6h18M3 18h18" />
      <circle cx="6" cy="12" r="2" fill={color} />
      <circle cx="18" cy="12" r="2" fill={color} />
    </svg>
  )
}

