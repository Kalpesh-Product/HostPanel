import PageFrame from "../../../../components/Pages/PageFrame";

interface PlanDashboardSkeletonProps {
  plan?: "basic" | "professional";
  includeHeader?: boolean;
}

const SkeletonBlock = ({ className }: { className: string }) => (
  <div className={`rounded-md bg-gray-200 ${className}`} />
);

const SectionHeaderSkeleton = () => (
  <div className="flex items-center rounded-t-xl border-2 border-borderGray p-4">
    <SkeletonBlock className="h-5 w-28" />
  </div>
);

const StatsSkeleton = ({ count, columns }: { count: number; columns: 3 | 4 }) => (
  <div>
    <SectionHeaderSkeleton />
    <div className={`grid grid-cols-1 gap-4 rounded-b-xl border-2 border-t-0 border-borderGray p-4 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-borderGray bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <SkeletonBlock className="h-10 w-10 rounded-lg" />
            <SkeletonBlock className="h-6 w-6 rounded-full" />
          </div>
          <SkeletonBlock className="mb-3 h-7 w-16" />
          <SkeletonBlock className="mb-2 h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2 bg-gray-100" />
        </div>
      ))}
    </div>
  </div>
);

const QuickLinksSkeleton = ({ columns }: { columns: 3 | 4 }) => (
  <div>
    <SectionHeaderSkeleton />
    <div className={`grid grid-cols-1 gap-4 rounded-b-xl border-2 border-t-0 border-borderGray p-4 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl border border-borderGray bg-white p-3">
          <SkeletonBlock className="h-9 w-9 flex-shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-3 w-full bg-gray-100" />
          </div>
          <SkeletonBlock className="h-4 w-4 flex-shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

const DetailRowSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {Array.from({ length: 2 }).map((_, cardIndex) => (
      <div key={cardIndex} className="overflow-hidden rounded-xl border-2 border-borderGray bg-white">
        <div className="flex items-center justify-between border-b-2 border-borderGray p-4">
          <SkeletonBlock className="h-5 w-32" />
          {cardIndex === 0 && <SkeletonBlock className="h-3 w-14" />}
        </div>
        <div className="space-y-4 p-4">
          {cardIndex === 0 ? (
            Array.from({ length: 4 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-36" />
                  <SkeletonBlock className="h-3 w-24 bg-gray-100" />
                </div>
                <SkeletonBlock className="h-5 w-16 rounded-full" />
              </div>
            ))
          ) : (
            <div className="flex h-44 items-center justify-center">
              <div className="h-36 w-36 rounded-full border-[18px] border-gray-200" />
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="overflow-hidden rounded-xl border-2 border-borderGray bg-white">
    <div className="border-b-2 border-borderGray p-4"><SkeletonBlock className="h-5 w-52" /></div>
    <div className="flex h-56 items-end gap-3 px-5 pb-5 pt-8">
      {[45, 70, 55, 85, 65, 90, 72, 58, 80, 62, 76, 50].map((height, index) => (
        <div key={index} className="flex h-full flex-1 items-end">
          <div className="w-full rounded-t bg-gray-200" style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  </div>
);

export const PlanDashboardSkeleton = ({ plan = "basic", includeHeader = false }: PlanDashboardSkeletonProps) => {
  const isProfessional = plan === "professional";

  return (
    <div className={includeHeader ? "flex flex-col gap-5 p-4" : "flex flex-col gap-5"} aria-busy="true" aria-label="Loading dashboard">
      {includeHeader && (
        <PageFrame>
          <div className="animate-pulse flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-6 w-32" />
                <SkeletonBlock className="h-6 w-24 rounded-full" />
              </div>
              <SkeletonBlock className="h-5 w-52" />
              <SkeletonBlock className="h-4 w-44 bg-gray-100" />
            </div>
            {isProfessional && (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-8 w-28 rounded-lg" />)}
              </div>
            )}
          </div>
        </PageFrame>
      )}

      <div className="animate-pulse flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
          <SkeletonBlock className="h-5 w-5 flex-shrink-0 rounded-full" />
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="ml-auto h-6 w-20 flex-shrink-0 rounded-full" />
        </div>
        <StatsSkeleton count={isProfessional ? 6 : 4} columns={isProfessional ? 3 : 4} />
        <QuickLinksSkeleton columns={isProfessional ? 4 : 3} />
        {Array.from({ length: isProfessional ? 3 : 2 }).map((_, index) => <DetailRowSkeleton key={index} />)}
        {Array.from({ length: isProfessional ? 3 : 1 }).map((_, index) => <ChartSkeleton key={index} />)}
      </div>
    </div>
  );
};

export default PlanDashboardSkeleton;
