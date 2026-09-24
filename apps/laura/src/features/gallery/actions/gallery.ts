"use server";

import { checkAppAccess, checkMutationAccess } from "@allonfire/auth/guard";
import {
  getFavoritePhotoIds,
  getFavoritesPaginated,
  toggleFavorite,
} from "@allonfire/database/laura/favorite";
import {
  deletePhoto,
  getPhotosPaginated,
  type PhotoWithUser,
} from "@allonfire/database/laura/photo";
import { blurHashToDataURL } from "@allonfire/storage";
import { auth } from "@/lib/auth";

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
    blurDataURL: blurHashToDataURL(photo.blurHash),
    caption: photo.caption,
    createdAt: photo.createdAt.toISOString(),
    height: photo.height,
    id: photo.id,
    isFavorite,
    thumbnailUrl: photo.thumbnailUrl,
    url: photo.url,
    user: photo.user,
    width: photo.width,
  };
}

export async function getPhotosAction(cursor?: string): Promise<GalleryPage> {
  await checkAppAccess(auth, "laura");
  const result = await getPhotosPaginated(cursor);
  const favoriteIds = await getFavoritePhotoIds(result.photos.map((p) => p.id));

  return {
    nextCursor: result.nextCursor,
    photos: result.photos.map((p) => mapPhoto(p, favoriteIds.has(p.id))),
  };
}

export async function getFavoritesAction(
  cursor?: string
): Promise<GalleryPage> {
  await checkAppAccess(auth, "laura");
  const result = await getFavoritesPaginated(cursor);
  return {
    nextCursor: result.nextCursor,
    photos: result.photos.map((photo) => mapPhoto(photo, true)),
  };
}

export async function toggleFavoriteAction(
  photoId: string
): Promise<{ isFavorite: boolean } | { error: string }> {
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { error: access.reason };
  }
  return await toggleFavorite(photoId);
}

export async function deletePhotoAction(
  photoId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await checkMutationAccess(auth);
  if (!access.allowed) {
    return { error: access.reason, success: false };
  }
  await deletePhoto(photoId);
  return { success: true };
}
