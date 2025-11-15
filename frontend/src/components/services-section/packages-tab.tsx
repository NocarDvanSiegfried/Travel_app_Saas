'use client'

import { ServicePackage } from '@/shared/types/services'
import { servicePackagesMock } from '@/shared/data/services'

export function PackagesTab() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {servicePackagesMock.map((pkg) => (
          <div key={pkg.id} className="yakutia-card p-[18px] fade-in">
            <h3 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--color-primary)' }}>
              {pkg.name}
            </h3>
            <ul className="space-y-3">
              {pkg.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 text-lg" style={{ color: 'var(--color-primary)' }}>
                    ✓
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-text-dark)' }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="w-full mt-5 px-6 py-3 rounded-yakutia yakutia-transition font-semibold text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              }}
            >
              Выбрать пакет
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

