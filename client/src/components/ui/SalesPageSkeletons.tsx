import Skeleton from "./Skeleton";

const StatCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-2 gap-3 ${count === 5 ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center justify-between rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="space-y-3"><Skeleton className="h-3 w-24 rounded-md" /><Skeleton className="h-5 w-10 rounded-md" /></div>
        <Skeleton className="h-8 w-8 rounded-2xl bg-slate-100" />
      </div>
    ))}
  </div>
);

const PageHeaderSkeleton = ({ actions }: { actions: number }) => (
  <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
    <div className="space-y-2"><Skeleton className="h-6 w-56 rounded-md" /><Skeleton className="h-3 w-96 max-w-full rounded-md bg-slate-100" /></div>
    <div className="flex gap-2 self-end md:self-auto">
      {Array.from({ length: actions }).map((_, index) => <Skeleton key={index} className="h-10 w-10 rounded-xl" />)}
    </div>
  </div>
);

const MainTabsSkeleton = ({ count }: { count: number }) => (
  <div className="flex gap-1.5 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
    {Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="h-8 min-w-28 flex-1 rounded-xl" />)}
  </div>
);

export function SalesTenantCompaniesSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading sales tenant companies">
      <PageHeaderSkeleton actions={3} />
      <div className="my-4"><MainTabsSkeleton count={2} /></div>
      <StatCardsSkeleton />
      <div className="mt-4 flex min-h-[440px] flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center">
          <div className="flex gap-1.5 overflow-hidden">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 w-20 flex-shrink-0 rounded-lg" />)}</div>
          <div className="flex w-full flex-wrap gap-3 xl:w-auto sm:flex-nowrap"><Skeleton className="h-10 min-w-[180px] flex-1 rounded-lg xl:w-64" /><Skeleton className="h-10 w-36 rounded-lg" /><Skeleton className="h-10 w-44 rounded-2xl" /></div>
        </div>
        <div className="overflow-x-auto"><div className="min-w-[920px]">
          <div className="grid grid-cols-6 gap-4 border-b border-slate-100 px-4 py-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-3 rounded-md" />)}</div>
          <div className="divide-y divide-slate-100">{Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-6 items-center gap-4 px-4 py-4">
              <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 flex-shrink-0 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 rounded-md" /><Skeleton className="h-3 w-16 rounded-md bg-slate-100" /></div></div>
              <div className="space-y-2"><Skeleton className="h-4 rounded-md bg-slate-100" /><Skeleton className="h-3 rounded-md bg-slate-100" /><Skeleton className="h-3 w-4/5 rounded-md bg-slate-100" /></div>
              <div className="space-y-2"><Skeleton className="h-3 rounded-md bg-slate-100" /><Skeleton className="h-3 rounded-md bg-slate-100" /></div>
              <div className="space-y-2"><Skeleton className="h-5 w-24 rounded-md" /><Skeleton className="h-3 rounded-md bg-slate-100" /></div>
              <Skeleton className="mx-auto h-6 w-24 rounded-md" />
              <div className="flex justify-center gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div>
            </div>
          ))}</div>
        </div></div>
      </div>
    </div>
  );
}

export function ResourcePricingSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading resource and pricing">
      <PageHeaderSkeleton actions={3} />
      <MainTabsSkeleton count={3} />
      <div className="mt-4"><StatCardsSkeleton /></div>
      <div className="flex min-h-[440px] flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 lg:p-5 xl:flex-row xl:items-center">
          <div className="flex gap-1.5 overflow-hidden">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 w-20 flex-shrink-0 rounded-lg" />)}</div>
          <div className="flex w-full gap-3 xl:w-auto"><Skeleton className="h-10 min-w-[180px] flex-1 rounded-lg xl:w-64" /><Skeleton className="h-10 w-36 rounded-2xl" /></div>
        </div>
        <div className="grid gap-3 border-b border-slate-100 bg-white p-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-16 rounded-md" /><Skeleton className="h-10 rounded-xl bg-slate-100" /></div>)}
        </div>
        <div className="overflow-x-auto"><div className="min-w-[1200px]">
          <div className="grid grid-cols-12 gap-3 border-b border-slate-100 px-4 py-3">{Array.from({ length: 12 }).map((_, index) => <Skeleton key={index} className="h-3 rounded-md" />)}</div>
          <div className="divide-y divide-slate-100">{Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-12 items-center gap-3 px-4 py-4">{Array.from({ length: 12 }).map((_, cellIndex) => <Skeleton key={cellIndex} className={cellIndex === 3 || cellIndex === 10 ? "h-6 w-20 rounded-full" : cellIndex === 11 ? "h-8 rounded-lg" : "h-4 rounded-md bg-slate-100"} />)}</div>
          ))}</div>
        </div></div>
      </div>
    </div>
  );
}

export function SalesArchitectureSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading sales architecture">
      <PageHeaderSkeleton actions={2} />
      <MainTabsSkeleton count={3} />
      <div className="mt-2 flex flex-wrap gap-2 border-b border-slate-100/40 bg-white px-3 py-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-9 w-32 rounded-xl" />)}</div>
      <StatCardsSkeleton count={5} />
      <div className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/80 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100/60 bg-slate-50/50 p-3 sm:p-4 xl:flex-row xl:items-center">
          <div className="flex gap-1.5"><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /></div><Skeleton className="h-10 w-full min-w-[180px] rounded-lg xl:w-64" />
        </div>
        <div className="flex-1 space-y-5 p-3 sm:p-4 lg:p-5"><div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Skeleton className="h-5 w-5 rounded-md" /><Skeleton className="h-5 w-48 rounded-md" /></div><Skeleton className="h-3 w-20 rounded-md" /></div>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl bg-slate-100" />)}</div>
          {Array.from({ length: 2 }).map((_, sectionIndex) => <div key={sectionIndex} className="mb-6 space-y-3">
            <div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-3 w-16 rounded-md" /><Skeleton className="h-5 w-28 rounded-md" /></div><Skeleton className="h-3 w-20 rounded-md" /></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="rounded-2xl border border-slate-100 p-3"><div className="mb-3 flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-4 w-24 rounded-md" /></div><Skeleton className="h-3 w-full rounded-md bg-slate-100" /></div>)}</div>
          </div>)}
        </div></div>
      </div>
    </div>
  );
}
