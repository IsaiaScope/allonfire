import { Skeleton } from "@allonfire/ui/components/skeleton";

const CARD_KEYS = Array.from({ length: 12 }, (_, i) => `card-${i}`);

export default function MemoryLoading() {
  return (
    <div className="flex flex-1 flex-col justify-center space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
      <div className="mx-auto grid w-full grid-cols-3 gap-2 sm:gap-3 md:max-w-lg md:grid-cols-4 md:gap-3.5 lg:max-w-xl lg:gap-4 xl:max-w-2xl xl:gap-5">
        {CARD_KEYS.map((key) => (
          <Skeleton className="aspect-3/4 w-full rounded-lg" key={key} />
        ))}
      </div>
    </div>
  );
}
