import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"].map((id) => (
          <Skeleton
            className="mb-3 w-full rounded-md"
            key={id}
            style={{ height: `${150 + (id.charCodeAt(1) % 3) * 60}px` }}
          />
        ))}
      </div>
    </div>
  );
}
