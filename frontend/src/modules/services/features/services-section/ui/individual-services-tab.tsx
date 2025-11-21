'use client'

import { individualServicesMock } from '@/modules/services/lib'

export function IndividualServicesTab() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {individualServicesMock.map((service) => (
          <div key={service.id} className="yakutia-card p-[18px] fade-in">
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-dark)' }}>
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-dark)' }}>
                {service.description}
              </p>
            )}
            <button
              type="button"
              className="w-full px-4 py-2 rounded-yakutia yakutia-transition font-medium text-white text-sm"
              style={{ backgroundColor: 'var(--color-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)'
              }}
            >
              Подробнее
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

