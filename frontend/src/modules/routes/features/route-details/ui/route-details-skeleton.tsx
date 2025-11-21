'use client';

export function RouteDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

