'use client'

import { servicePackagesMock } from '@/modules/services/lib'

export function PackagesTab() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {servicePackagesMock.map((pkg) => (
          <div key={pkg.id} className="card p-lg fade-in">
            <h3 className="text-lg font-medium mb-md text-center text-primary">
              {pkg.name}
            </h3>
            <ul className="space-y-sm">
              {pkg.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-sm text-md text-primary">
                    ✓
                  </span>
                  <span className="text-sm text-primary">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn-primary w-full mt-lg"
            >
              Выбрать пакет
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

