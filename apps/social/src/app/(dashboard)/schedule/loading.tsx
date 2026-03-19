import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function ScheduleLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <div className="space-y-3">
        {["s1", "s2", "s3"].map((id) => (
          <Card key={id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-4 w-32 font-mono" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
