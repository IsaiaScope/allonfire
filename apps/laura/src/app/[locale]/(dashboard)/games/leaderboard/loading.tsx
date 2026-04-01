import { Card, CardContent } from "@allonfire/ui/components/card";
import { Skeleton } from "@allonfire/ui/components/skeleton";
import { PageContainer } from "@/features/layout/components/page-container";

const STAT_KEYS = ["s1", "s2", "s3", "s4"];
const ROW_KEYS = ["r1", "r2", "r3", "r4", "r5"];

export default function LeaderboardLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1 h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>

        <Card className="gap-0 py-2">
          <CardContent className="space-y-3 px-0">
            {ROW_KEYS.map((id) => (
              <div className="flex items-center gap-3 px-4" key={id}>
                <Skeleton className="h-4 w-6" />
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_KEYS.map((id) => (
            <Card key={id}>
              <CardContent className="flex flex-col items-center p-3">
                <Skeleton className="mb-1 size-4 rounded" />
                <Skeleton className="h-6 w-10" />
                <Skeleton className="mt-1 h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
