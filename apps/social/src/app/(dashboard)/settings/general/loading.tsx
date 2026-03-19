import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import { Separator } from "@allonfire/ui/components/separator";
import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* n8n Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-16 rounded-md" />
        </CardContent>
      </Card>

      <Separator />

      {/* Platforms */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["p1", "p2", "p3", "p4"].map((id) => (
              <div
                className="flex items-center justify-between rounded-md border px-4 py-3"
                key={id}
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Bearer Token */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </CardContent>
      </Card>

      <Separator />

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
