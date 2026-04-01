import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import { Skeleton } from "@allonfire/ui/components/skeleton";
import { PageContainer } from "@/features/layout/components/page-container";

export default function SettingsLoading() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-28" />
        <div className="grid gap-4">
          {["c1", "c2", "c3"].map((id) => (
            <Card key={id}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
