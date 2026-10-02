import { AllowedApp } from "@allonfire/database/enums";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import type { ImageDeps } from "../../routes/image/utils/deps";

const unexpected = (name: string) => () =>
  Promise.reject(new Error(`${name} must not be called`));

/** An Image as the service returns it; override what the test is about. */
export const imageRecord = (
  overrides: Partial<ImageRecord> = {}
): ImageRecord => ({
  alt: { en: "The sea", it: "Il mare" },
  app: AllowedApp.LAURA,
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1000,
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  height: 600,
  id: "image-1",
  key: "0b9a0c3e-0000-4000-8000-000000000001.webp",
  uploadedBy: "user-1",
  width: 800,
  ...overrides,
});

/** Every dependency fails loudly unless the test supplies it. */
export const stubImageDeps = (
  overrides: Partial<ImageDeps> = {}
): ImageDeps => ({
  createImages: unexpected("createImages"),
  deleteImages: unexpected("deleteImages"),
  deleteObjects: unexpected("deleteObjects"),
  getImage: unexpected("getImage"),
  listImages: unexpected("listImages"),
  log: { warn: () => undefined },
  prepare: unexpected("prepare"),
  putObject: unexpected("putObject"),
  updateImages: unexpected("updateImages"),
  ...overrides,
});
