import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function DraftsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      <div className="space-y-3">
        {["d1", "d2", "d3"].map((id) => (
          <Card key={id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="ml-auto h-3 w-32" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 rounded-md bg-muted/50 p-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
