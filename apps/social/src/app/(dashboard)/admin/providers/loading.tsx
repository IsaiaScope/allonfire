import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function AdminProvidersLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Status banner */}
      <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
        <Skeleton className="size-4 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Provider cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {["pr1", "pr2", "pr3"].map((id) => (
          <Card key={id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-3 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
