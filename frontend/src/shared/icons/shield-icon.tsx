'use client'

import { forwardRef } from 'react'

interface ShieldIconProps {
  className?: string
  color?: string
  size?: number | string
}

export const ShieldIcon = forwardRef<SVGSVGElement, ShieldIconProps>(
  ({ className = '', color = 'currentColor', size = 20 }, ref) => (
    <svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L4 7V12C4 16.5 6.5 20.5 12 22C17.5 20.5 20 16.5 20 12V7L12 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
)

ShieldIcon.displayName = 'ShieldIcon'