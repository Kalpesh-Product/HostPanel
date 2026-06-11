export function BookingsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-96 rounded-3xl bg-gray-100" />
    </div>
  );
}

export function TablePageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="h-96 rounded-3xl bg-gray-100" />
    </div>
  );
}

export function HousekeepingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-3xl bg-gray-100" />
    </div>
  );
}

export function ResourceManagementSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-3xl bg-gray-100" />
    </div>
  );
}
