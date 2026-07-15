import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'circle';
}

function Skeleton({ className = '', variant = 'default', ...props }: SkeletonProps) {
  return <div className={`animate-pulse ${variant === 'circle' ? 'rounded-full' : 'rounded-md'} bg-gray-200 ${className}`} {...props} />;
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

export function AttendanceSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      <div className="h-8 w-64 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="h-10 rounded-2xl bg-gray-100" />
      <div className="h-64 rounded-2xl bg-gray-100" />
    </div>
  );
}

export function TasksSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-full bg-gray-200" />
          <div className="h-4 w-64 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-2xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function LeaveSkeleton() {
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
          <div key={i} className="h-28 rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-2xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function HREmployeeManagementSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-56 rounded-full bg-gray-200" />
          <div className="h-4 w-72 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
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

export function CustomerSupportSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading customer support">
      <div className="mb-3 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md bg-gray-200" />
          <div className="h-3 w-full max-w-xl rounded-md bg-gray-100 sm:w-[34rem]" />
        </div>
        <div className="flex gap-2 self-end md:self-auto">
          <div className="h-10 w-10 rounded-xl bg-gray-200" />
          <div className="h-10 w-10 rounded-xl bg-gray-200" />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <div className="h-3 w-20 rounded-md bg-gray-200" />
              <div className="h-5 w-10 rounded-md bg-gray-200" />
            </div>
            <div className="h-8 w-8 rounded-2xl bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="mb-3 flex gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
        <div className="h-8 flex-1 rounded-xl bg-gray-200" />
        <div className="h-8 flex-1 rounded-xl bg-gray-100" />
      </div>

      <div className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center">
          <div className="flex gap-1.5 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-8 w-16 flex-shrink-0 rounded-lg bg-gray-200" />
            ))}
          </div>
          <div className="flex w-full items-center gap-3 xl:w-auto">
            <div className="h-10 min-w-[180px] flex-1 rounded-lg bg-gray-200 xl:w-64" />
            <div className="h-10 w-44 flex-shrink-0 rounded-2xl bg-gray-200" />
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-7 gap-4 border-b border-slate-100/60 bg-slate-50/50 px-4 py-3.5">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-3 rounded-md bg-gray-200" />
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-7 items-center gap-4 px-4 py-4">
                {Array.from({ length: 7 }).map((_, cellIndex) => (
                  <div
                    key={cellIndex}
                    className={`h-4 rounded-md ${cellIndex === 4 ? "w-16 rounded-full bg-gray-200" : cellIndex === 6 ? "h-7 w-7 rounded-lg bg-gray-200" : "bg-gray-100"}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WebsiteReviewsSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading website reviews">
      <div className="mb-1 space-y-2">
        <Skeleton className="h-6 w-44 rounded-md" />
        <Skeleton className="h-3 w-72 max-w-full rounded-md bg-gray-100" />
      </div>

      <div className="mb-1 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-md" />
            </div>
            <Skeleton className="h-8 w-8 rounded-2xl bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="flex min-h-[400px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center">
          <div className="flex gap-1.5 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20 flex-shrink-0 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full min-w-[180px] rounded-lg sm:w-72" />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-8 gap-4 border-b border-slate-100/60 bg-slate-50/50 px-5 py-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-3 rounded-md" />
              ))}
            </div>
            <div className="divide-y divide-slate-100/60">
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-8 items-center gap-4 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 flex-shrink-0 rounded-2xl" />
                    <Skeleton className="h-4 flex-1 rounded-md bg-gray-100" />
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Skeleton key={starIndex} className="h-3 w-3 rounded-sm" />
                    ))}
                  </div>
                  <Skeleton className="h-4 rounded-md bg-gray-100" />
                  <Skeleton className="h-4 rounded-md bg-gray-100" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 rounded-md bg-gray-100" />
                  <Skeleton className="mx-auto h-7 w-7 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WebsiteLeadsSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading website leads">
      <div className="mb-1 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-3 w-80 max-w-full rounded-md bg-gray-100" />
        </div>
        <div className="flex gap-2 self-end md:self-auto">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      <div className="mb-1 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-md" />
            </div>
            <Skeleton className="h-8 w-8 rounded-2xl bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center">
          <div className="flex gap-1.5 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20 flex-shrink-0 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full min-w-[180px] rounded-lg sm:w-72" />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 gap-4 border-b border-slate-100/60 bg-slate-50/50 px-5 py-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-3 rounded-md" />
              ))}
            </div>
            <div className="divide-y divide-slate-100/60">
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 items-center gap-4 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 flex-shrink-0 rounded-2xl" />
                    <Skeleton className="h-4 flex-1 rounded-md bg-gray-100" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 rounded-md bg-gray-100" />
                    <Skeleton className="h-3 w-4/5 rounded-md bg-gray-100" />
                  </div>
                  <Skeleton className="h-4 rounded-md bg-gray-100" />
                  <Skeleton className="h-4 rounded-md bg-gray-100" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 rounded-md bg-gray-100" />
                  <Skeleton className="mx-auto h-7 w-7 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HRLeaveRequestsProcessingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-56 rounded-full bg-gray-200" />
          <div className="h-4 w-72 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="h-10 rounded-2xl bg-gray-100 w-96" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function HRAttendanceReviewSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-56 rounded-full bg-gray-200" />
          <div className="h-4 w-72 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="h-10 rounded-2xl bg-gray-100 w-96" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function HRRecruitmentSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-56 rounded-full bg-gray-200" />
          <div className="h-4 w-72 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="h-10 rounded-2xl bg-gray-100 w-96" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function HRDocumentsSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-full bg-gray-200" />
          <div className="h-4 w-64 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="h-10 rounded-2xl bg-gray-100 w-96" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function HRPayrollSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-56 rounded-full bg-gray-200" />
          <div className="h-4 w-72 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="h-10 rounded-2xl bg-gray-100 w-96" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-12 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function OrganizationSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-full bg-gray-200" />
          <div className="h-4 w-64 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[2rem] bg-gray-100" />
        ))}
      </div>
      <div className="h-10 rounded-2xl bg-gray-100 w-80" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}

export function HRExitManagementSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-full bg-gray-200" />
          <div className="h-4 w-64 rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="h-10 rounded-2xl bg-gray-100 w-80" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-gray-100" />
        ))}
      </div>
      <div className="h-14 rounded-3xl bg-gray-100" />
      <div className="h-96 rounded-[2.5rem] bg-gray-100" />
    </div>
  );
}
