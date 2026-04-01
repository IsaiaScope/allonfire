import { Skeleton } from "@allonfire/ui/components/skeleton";
import { PageContainer } from "@/features/layout/components/page-container";

export default function UploadLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </PageContainer>
  );
}
