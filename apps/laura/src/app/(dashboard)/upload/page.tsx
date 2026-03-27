import { UploadClient } from "@/features/upload/components/upload-client";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Upload Photos</h1>
        <p className="mt-1 text-muted-foreground">
          Add new photos to the gallery
        </p>
      </div>
      <UploadClient />
    </div>
  );
}
