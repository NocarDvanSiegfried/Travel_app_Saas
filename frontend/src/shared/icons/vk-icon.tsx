interface VkIconProps {
  className?: string
  color?: string
}

export default function VkIcon({ className = 'w-5 h-5', color = 'currentColor' }: VkIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  )
}

