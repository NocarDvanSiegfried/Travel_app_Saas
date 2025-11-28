'use client'

import { SearchForm } from '@/modules/routes/features/route-search/ui'
import { RouteInfoBlock } from '@/components/ui/RouteInfoBlock'

export function RoutesSection() {
  return (
    <section className="w-full">
      <div className="mt-6">
        <SearchForm />
      </div>

      {/* Adaptive Info Block */}
      <div className="mt-8">
        <RouteInfoBlock
          maxItems={6}
          collapsible={true}
          className="w-full"
        />
      </div>
    </section>
  )
}

