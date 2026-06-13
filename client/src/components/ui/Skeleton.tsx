import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className = '', ...props }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} {...props} />;
}

export default Skeleton;

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

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-56 rounded-full bg-gray-200" />
          <div className="h-4 w-36 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-4xl bg-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-80 rounded-[2.5rem] bg-gray-100" />
        <div className="h-80 rounded-[2.5rem] bg-gray-100" />
      </div>
    </div>
  );
}

export function CardsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="animate-pulse p-6">
      <div className="mb-6 h-8 w-72 rounded-full bg-gray-200" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-72 rounded-3xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export function TicketsSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-full bg-gray-200" />
          <div className="h-4 w-64 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}
