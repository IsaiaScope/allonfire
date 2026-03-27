"use server";

import { getPhotosPaginated } from "@allonfire/database";
import { blurHashToDataURL } from "@allonfire/storage";

export type GalleryPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  blurDataURL: string;
  caption: string | null;
  createdAt: string;
  user: { name: string | null; image: string | null };
};

export type GalleryPage = {
  photos: GalleryPhoto[];
  nextCursor: string | null;
};

export async function getPhotosAction(cursor?: string): Promise<GalleryPage> {
  const result = await getPhotosPaginated(cursor);

  return {
    photos: result.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      width: photo.width,
      height: photo.height,
      blurDataURL: blurHashToDataURL(photo.blurHash),
      caption: photo.caption,
      createdAt: photo.createdAt.toISOString(),
      user: photo.user,
    })),
    nextCursor: result.nextCursor,
  };
}
