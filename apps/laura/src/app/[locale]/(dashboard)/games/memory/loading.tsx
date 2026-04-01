import { Skeleton } from "@allonfire/ui/components/skeleton";

const CARD_KEYS = Array.from({ length: 12 }, (_, i) => `card-${i}`);

export default function MemoryLoading() {
  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-2 sm:max-w-2xl sm:gap-4 lg:max-w-3xl">
      <div className="mx-auto flex w-full shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-28 sm:h-8" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-12 sm:h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-6 sm:h-5" />
          </div>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
        {CARD_KEYS.map((key) => (
          <Skeleton className="aspect-3/4 w-full rounded-lg" key={key} />
        ))}
      </div>
    </div>
  );
}
