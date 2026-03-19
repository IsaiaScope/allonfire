import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function DiscoverLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-9 flex-1" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["c1", "c2", "c3", "c4", "c5", "c6"].map((id) => (
            <Skeleton className="h-7 w-20 rounded-full" key={id} />
          ))}
        </div>
      </div>

      {/* Topic cards grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {["t1", "t2", "t3", "t4", "t5", "t6"].map((id) => (
          <div className="space-y-3 rounded-lg border bg-card p-4" key={id}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
