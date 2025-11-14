'use client'

import React from 'react'

type ServicesIconProps = {
  className?: string
  color?: string
}

export function ServicesIcon({ className = 'w-5 h-5', color = 'currentColor' }: ServicesIconProps) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M10 3v18" />
      <circle cx="7" cy="7" r="1" fill={color} />
      <circle cx="17" cy="7" r="1" fill={color} />
      <circle cx="7" cy="17" r="1" fill={color} />
      <circle cx="17" cy="17" r="1" fill={color} />
    </svg>
  )
}

