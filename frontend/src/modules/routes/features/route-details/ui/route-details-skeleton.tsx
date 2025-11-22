'use client';

export function RouteDetailsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="h-8 rounded-sm w-3/4 mb-4 animate-pulse" style={{ backgroundColor: 'var(--color-background-subtle)' }}></div>
        <div className="h-4 rounded-sm w-1/2 mb-2 animate-pulse" style={{ backgroundColor: 'var(--color-background-subtle)' }}></div>
        <div className="h-4 rounded-sm w-1/3 animate-pulse" style={{ backgroundColor: 'var(--color-background-subtle)' }}></div>
      </div>

      <div className="card p-5">
        <div className="h-6 rounded-sm w-1/4 mb-4 animate-pulse" style={{ backgroundColor: 'var(--color-background-subtle)' }}></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-sm animate-pulse" style={{ backgroundColor: 'var(--color-background-subtle)' }}></div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="h-6 rounded-sm w-1/4 mb-4 animate-pulse" style={{ backgroundColor: 'var(--color-background-subtle)' }}></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-sm animate-pulse" style={{ backgroundColor: 'var(--color-background-subtle)' }}></div>
          ))}
        </div>
      </div>
    </div>
  );
}

