import { App, ImageAccess } from "@allonfire/database/enums";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";

/** An Image as the API answers it, for a test: the sea in English and Italian, `overrides` laid over it. */
export const imageBody = (overrides: Partial<ImageBody> = {}): ImageBody => ({
  access: ImageAccess.PUBLIC,
  alt: { en: "The sea", it: "Il mare" },
  apps: [App.BACK_OFFICE],
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1_500_000,
  createdAt: "2026-10-02T10:00:00.000Z",
  height: 600,
  id: "image-1",
  key: "0b9a0c3e-0000-4000-8000-0000000000bb.avif",
  srcSet: [{ url: "https://cdn.test/sea-400.avif", width: 400 }],
  version: "version-1",
  width: 800,
  ...overrides,
});
