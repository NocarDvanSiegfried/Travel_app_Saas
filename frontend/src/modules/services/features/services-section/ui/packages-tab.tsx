'use client'

import { servicePackagesMock } from '@/modules/services/lib'
import { InsuranceTab } from './insurance-tab'

export function PackagesTab() {
  return (
    <div className="w-full space-y-xl">
      {/* Новая секция страхования */}
      <section>
        <h2 className="text-2xl font-medium mb-lg text-header-text text-center">
          🛡️ Защитите свое путешествие
        </h2>
        <p className="text-center text-secondary mb-xl">
          Два типа страхования для максимальной безопасности вашей поездки
        </p>
        <InsuranceTab />
      </section>

      {/* Разделитель */}
      <div className="relative my-xl">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-light"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-md text-sm text-gray-600">или</span>
        </div>
      </div>

      {/* Существующие пакеты */}
      <section>
        <h2 className="text-2xl font-medium mb-lg text-header-text text-center">
          Премиум пакеты услуг
        </h2>
        <p className="text-center text-secondary mb-xl">
          Выберите готовый набор услуг для комфортного путешествия
        </p>
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
      </section>
    </div>
  )
}

