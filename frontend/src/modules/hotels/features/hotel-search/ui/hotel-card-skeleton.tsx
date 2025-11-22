'use client'

export function HotelCardSkeleton() {
  return (
    <div className="card p-lg">
      <div className="flex flex-col md:flex-row gap-md">
        {/* Skeleton фото */}
        <div className="w-full md:w-64 h-48 md:h-40 rounded-sm overflow-hidden flex-shrink-0">
          <div className="w-full h-full animate-pulse bg-background-subtle" />
        </div>

        {/* Skeleton информация */}
        <div className="flex-1 flex flex-col gap-md">
          <div className="flex items-start justify-between">
            <div className="h-6 w-48 rounded-sm animate-pulse bg-background-subtle" />
            <div className="h-5 w-12 rounded-sm animate-pulse bg-background-subtle" />
          </div>

          <div className="space-y-sm">
            <div className="h-4 w-full rounded-sm animate-pulse bg-background-subtle" />
            <div className="h-4 w-3/4 rounded-sm animate-pulse bg-background-subtle" />
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="h-6 w-24 rounded-sm animate-pulse bg-background-subtle" />
            <div className="h-lg w-40 rounded-sm animate-pulse bg-background-subtle" />
          </div>
        </div>
      </div>
    </div>
  )
}

