'use client'

import { useState } from 'react'
import { RussiaMapSvg } from './russia-map-svg'

export function RussiaMap() {
  const [scale, setScale] = useState(1)

  return (
    <section className="yakutia-card p-[18px]">
      <h2 className="text-2xl font-semibold mb-4 text-center" style={{ color: 'var(--color-text-dark)' }}>
        Карта России
      </h2>
      
      <div className="relative overflow-hidden rounded-yakutia w-full flex items-center justify-center">
        <div
          className="h-[600px] w-full relative"
          style={{ 
            transform: `scale(${scale * 1.5})`,
            transformOrigin: 'center center',
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <RussiaMapSvg 
            className="absolute inset-0"
            scale={1}
          />
        </div>
      </div>

      {/* Контролы масштабирования */}
      <div className="flex items-center justify-center space-x-4 mt-4">
        <button
          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          className="px-4 py-2 rounded-yakutia hover:bg-white/30 yakutia-transition font-semibold"
          style={{ 
            backgroundColor: 'var(--color-input-bg)', 
            color: 'var(--color-text-light)', 
            borderColor: 'var(--color-input-border)' 
          }}
          aria-label="Уменьшить"
        >
          −
        </button>
        <span className="text-sm font-medium min-w-[50px] text-center" style={{ color: 'var(--color-text-light)' }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(Math.min(2, scale + 0.1))}
          className="px-4 py-2 rounded-yakutia hover:bg-white/30 yakutia-transition font-semibold"
          style={{ 
            backgroundColor: 'var(--color-input-bg)', 
            color: 'var(--color-text-light)', 
            borderColor: 'var(--color-input-border)' 
          }}
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
    </section>
  )
}

