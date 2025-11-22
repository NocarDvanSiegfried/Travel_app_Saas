'use client';

export function RouteDetailsSkeleton() {
  return (
    <div className="space-y-lg">
      <div className="card p-lg">
        <div className="h-8 rounded-sm w-3/4 mb-md animate-pulse bg-background-subtle"></div>
        <div className="h-4 rounded-sm w-1/2 mb-sm animate-pulse bg-background-subtle"></div>
        <div className="h-4 rounded-sm w-1/3 animate-pulse bg-background-subtle"></div>
      </div>

      <div className="card p-lg">
        <div className="h-6 rounded-sm w-1/4 mb-md animate-pulse bg-background-subtle"></div>
        <div className="space-y-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-sm animate-pulse bg-background-subtle"></div>
          ))}
        </div>
      </div>

      <div className="card p-lg">
        <div className="h-6 rounded-sm w-1/4 mb-md animate-pulse bg-background-subtle"></div>
        <div className="space-y-md">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-sm animate-pulse bg-background-subtle"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

