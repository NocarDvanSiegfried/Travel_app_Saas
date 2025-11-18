'use client'

import React from 'react'

type CarIconProps = {
  className?: string
  color?: string
}

export function CarIcon({ className = 'w-5 h-5', color = 'currentColor' }: CarIconProps) {
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
      <path d="M5 17h14v-3H5v3zM7 11l3-3h4l3 3" />
      <circle cx="7.5" cy="17.5" r="2.5" fill={color} />
      <circle cx="16.5" cy="17.5" r="2.5" fill={color} />
    </svg>
  )
}

