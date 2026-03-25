import type { Platform } from "@allonfire/database";

export type ImageSpec = {
  maxWidth: number;
  maxHeight: number;
  maxSizeKb: number;
  formats: string[];
};

export const PLATFORM_IMAGE_SPECS: Record<Platform, ImageSpec> = {
  TWITTER: {
    maxWidth: 1200,
    maxHeight: 675,
    maxSizeKb: 5120,
    formats: ["jpeg", "png", "webp"],
  },
  LINKEDIN: {
    maxWidth: 1200,
    maxHeight: 627,
    maxSizeKb: 10_240,
    formats: ["jpeg", "png"],
  },
};
