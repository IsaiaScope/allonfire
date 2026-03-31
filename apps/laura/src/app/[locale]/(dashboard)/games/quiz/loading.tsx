import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function QuizLoading() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="h-1 w-full rounded-full" />

      <Skeleton className="aspect-video w-full rounded-xl" />

      <Skeleton className="h-6 w-3/4" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>

      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
