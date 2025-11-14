'use client'

import { useState } from 'react'
import { RussiaMapSvg } from './russia-map-svg'

export function RussiaMap() {
  const [scale, setScale] = useState(1)

  return (
    <section className="mt-9 yakutia-card p-5">
      <h2 className="text-2xl font-semibold text-white mb-5 text-center">
        Карта России
      </h2>
      
      <div className="relative overflow-x-auto overflow-y-hidden rounded-yakutia border border-white/35 bg-white/15 w-full">
        <div
          className="h-[500px] relative"
          style={{ 
            width: `${Math.max(100, 150 * scale)}%`,
            minWidth: '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <RussiaMapSvg 
            className="absolute inset-0"
            scale={scale}
          />
        </div>
      </div>

      {/* Контролы масштабирования */}
      <div className="flex items-center justify-center space-x-4 mt-4">
        <button
          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          className="px-4 py-2 bg-white/15 text-white rounded-yakutia hover:bg-white/25 yakutia-transition font-semibold border border-white/25"
          aria-label="Уменьшить"
        >
          −
        </button>
        <span className="text-white text-sm font-medium min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(Math.min(2, scale + 0.1))}
          className="px-4 py-2 bg-white/15 text-white rounded-yakutia hover:bg-white/25 yakutia-transition font-semibold border border-white/25"
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
    </section>
  )
}

