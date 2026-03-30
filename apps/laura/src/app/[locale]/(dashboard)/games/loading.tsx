import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function GamesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-4 w-48" />
    </div>
  );
}
