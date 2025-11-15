'use client'

type RussiaMapSvgProps = {
  className?: string
  scale?: number
}

export function RussiaMapSvg({ className = '', scale = 1 }: RussiaMapSvgProps) {
  return (
    <svg
      viewBox="0 0 2000 1000"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
      }}
    >
      <g
        style={{
          transform: `scale(${scale})`,
          transformOrigin: '1000px 500px',
        }}
      >
        {/* Основной контур России - более детализированный */}
        <path
          d="M 100 200 
             L 150 190 L 250 180 L 400 170 L 600 160 L 800 150 L 1000 140 L 1200 130 L 1400 125 L 1600 120 L 1800 115 L 1900 110 L 1950 120
             L 1960 180 L 1950 250 L 1930 350 L 1900 450 L 1850 550 L 1800 650 L 1750 750 L 1700 850 L 1650 920 L 1600 960 L 1500 970
             L 1400 965 L 1300 960 L 1200 955 L 1100 950 L 1000 945 L 900 940 L 800 935 L 700 930 L 600 925 L 500 920 L 400 915 L 300 910
             L 200 905 L 150 900 L 100 890 L 80 850 L 70 750 L 65 650 L 60 550 L 58 450 L 60 350 L 65 250 L 70 200 Z"
          fill="rgba(255, 255, 255, 0.05)"
          stroke="var(--color-map-stroke)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        
        {/* Крым */}
        <path
          d="M 400 850 L 450 840 L 500 835 L 550 840 L 500 860 L 450 865 L 400 860 Z"
          fill="rgba(255, 255, 255, 0.05)"
          stroke="var(--color-map-stroke)"
          strokeWidth="3"
        />
        
        {/* Калининград */}
        <path
          d="M 100 400 L 120 395 L 140 400 L 135 415 L 115 420 L 100 415 Z"
          fill="rgba(255, 255, 255, 0.05)"
          stroke="var(--color-map-stroke)"
          strokeWidth="3"
        />
        
        {/* Дальний Восток - более детализированный */}
        <path
          d="M 1900 200 L 1950 220 L 1980 280 L 1990 350 L 1980 420 L 1960 480 L 1930 520 L 1900 540 L 1870 530 L 1850 480 L 1840 420 L 1850 360 L 1870 300 L 1890 240 Z"
          fill="rgba(255, 255, 255, 0.05)"
          stroke="var(--color-map-stroke)"
          strokeWidth="3"
        />
      </g>
    </svg>
  )
}
