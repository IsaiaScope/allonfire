"use server";

import type { PhotoWithUser } from "@allonfire/database";
import {
  deletePhoto,
  getFavoritePhotoIds,
  getFavoritesPaginated,
  getPhotosPaginated,
  toggleFavorite,
} from "@allonfire/database";
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
  isFavorite: boolean;
  user: { name: string | null; image: string | null };
};

export type GalleryPage = {
  photos: GalleryPhoto[];
  nextCursor: string | null;
};

function mapPhoto(photo: PhotoWithUser, isFavorite: boolean): GalleryPhoto {
  return {
    id: photo.id,
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    width: photo.width,
    height: photo.height,
    blurDataURL: blurHashToDataURL(photo.blurHash),
    caption: photo.caption,
    createdAt: photo.createdAt.toISOString(),
    isFavorite,
    user: photo.user,
  };
}

export async function getPhotosAction(cursor?: string): Promise<GalleryPage> {
  const result = await getPhotosPaginated(cursor);
  const favoriteIds = await getFavoritePhotoIds(result.photos.map((p) => p.id));

  return {
    photos: result.photos.map((p) => mapPhoto(p, favoriteIds.has(p.id))),
    nextCursor: result.nextCursor,
  };
}

export async function getFavoritesAction(
  cursor?: string
): Promise<GalleryPage> {
  const result = await getFavoritesPaginated(cursor);
  return {
    photos: result.photos.map((photo) => mapPhoto(photo, true)),
    nextCursor: result.nextCursor,
  };
}

export async function toggleFavoriteAction(
  photoId: string
): Promise<{ isFavorite: boolean }> {
  return await toggleFavorite(photoId);
}

export async function deletePhotoAction(photoId: string): Promise<void> {
  await deletePhoto(photoId);
}
