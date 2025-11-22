'use client'

export function HotelCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Skeleton фото */}
        <div className="w-full md:w-64 h-48 md:h-40 rounded-sm overflow-hidden flex-shrink-0">
          <div
            className="w-full h-full animate-pulse"
            style={{
              backgroundColor: 'var(--color-card-bg)',
            }}
          />
        </div>

        {/* Skeleton информация */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div
              className="h-6 w-48 rounded animate-pulse"
              style={{
                backgroundColor: 'var(--color-card-bg)',
              }}
            />
            <div
              className="h-5 w-12 rounded animate-pulse"
              style={{
                backgroundColor: 'var(--color-card-bg)',
              }}
            />
          </div>

          <div className="space-y-2">
            <div
              className="h-4 w-full rounded animate-pulse"
              style={{
                backgroundColor: 'var(--color-card-bg)',
              }}
            />
            <div
              className="h-4 w-3/4 rounded animate-pulse"
              style={{
                backgroundColor: 'var(--color-card-bg)',
              }}
            />
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div
              className="h-6 w-24 rounded animate-pulse"
              style={{
                backgroundColor: 'var(--color-card-bg)',
              }}
            />
            <div
              className="h-10 w-40 rounded animate-pulse"
              style={{
                backgroundColor: 'var(--color-card-bg)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

