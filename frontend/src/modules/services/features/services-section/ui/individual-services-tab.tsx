'use client'

import { individualServicesMock } from '@/modules/services/lib'

export function IndividualServicesTab() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {individualServicesMock.map((service) => (
          <div key={service.id} className="card p-lg fade-in">
            <h3 className="text-lg font-medium mb-sm text-primary">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm mb-lg text-secondary">
                {service.description}
              </p>
            )}
            <button
              type="button"
              className="btn-primary w-full text-sm"
            >
              Подробнее
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

