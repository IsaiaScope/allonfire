import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import { signedSrcSet } from "@allonfire/storage/features/image-server/sign";
import type { DeckImage } from "../constants/schemas";

/** An Image as a card draws it at `now`: a private picture's links end within the hour. */
export const toDeckImage = (image: ImageRecord, now: Date): DeckImage => ({
  alt: image.alt,
  blurDataUrl: image.blurDataUrl,
  height: image.height,
  id: image.id,
  srcSet: signedSrcSet(image, now),
  width: image.width,
});
