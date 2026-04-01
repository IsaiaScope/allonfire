import { Card, CardHeader } from "@allonfire/ui/components/card";
import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function TopicDetailLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-7 w-3/4" />
        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-3 h-12 w-full" />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <div className="space-y-3">
        {["p1", "p2"].map((id) => (
          <Card key={id}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                <Skeleton className="size-4" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="mt-2 h-4 w-full" />
                </div>
                <Skeleton className="size-6" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
