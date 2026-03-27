import { Button } from "@allonfire/ui/components/button";
import { Images, Upload } from "lucide-react";
import Link from "next/link";

export function GalleryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Images className="size-16 text-muted-foreground/50" />
      <div className="text-center">
        <h2 className="font-semibold text-lg">No photos yet</h2>
        <p className="mt-1 text-muted-foreground">
          Upload your first photos to get started
        </p>
      </div>
      <Button asChild>
        <Link href="/upload">
          <Upload className="size-4" />
          Upload Photos
        </Link>
      </Button>
    </div>
  );
}
