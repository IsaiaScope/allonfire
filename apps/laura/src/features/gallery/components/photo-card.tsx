"use client";

import Image from "next/image";
import type { GalleryPhoto } from "@/features/gallery/actions/gallery";

type PhotoCardProps = {
  photo: GalleryPhoto;
  onClick: () => void;
};

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const aspectRatio = photo.height / photo.width;

  return (
    <button
      className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
      onClick={onClick}
      type="button"
    >
      <Image
        alt={photo.caption ?? ""}
        blurDataURL={photo.blurDataURL}
        className="w-full rounded-lg transition-transform duration-200 hover:scale-[1.02]"
        height={Math.round(400 * aspectRatio)}
        placeholder="blur"
        src={photo.thumbnailUrl}
        width={400}
      />
    </button>
  );
}
