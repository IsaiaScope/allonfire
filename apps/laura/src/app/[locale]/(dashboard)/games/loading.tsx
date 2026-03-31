import { Card, CardFooter, CardHeader } from "@allonfire/ui/components/card";
import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function GamesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardFooter className="gap-2">
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
