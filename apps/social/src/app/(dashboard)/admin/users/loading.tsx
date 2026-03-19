import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import { Separator } from "@allonfire/ui/components/separator";
import { Skeleton } from "@allonfire/ui/components/skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Add User */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </CardContent>
      </Card>

      <Separator />

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["u1", "u2", "u3"].map((id) => (
              <div
                className="flex items-center justify-between rounded-md border px-4 py-3"
                key={id}
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
