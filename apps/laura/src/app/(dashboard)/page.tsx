import { getPhotosAction } from "@/features/gallery/actions/gallery";
import { GalleryClient } from "@/features/gallery/components/gallery-client";

export default async function GalleryPage() {
  const initialData = await getPhotosAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Gallery</h1>
        <p className="mt-1 text-muted-foreground">Our photos together</p>
      </div>
      <GalleryClient initialData={initialData} />
    </div>
  );
}
