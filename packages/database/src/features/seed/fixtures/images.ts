import { App, ImageAccess } from "../../../../generated/prisma/enums";

/** An Image Fixture: one Image every Test bucket holds. */
export type FixtureImage = {
  /** `<uuid>.avif`, fixed so tests can name it. */
  key: string;
  /** File name under `@allonfire/storage`'s Image Fixture files. */
  source: string;
  width: number;
  height: number;
  bytes: number;
  blurDataUrl: string;
  alt: { en: string; it: string };
  /** Public or private in every App it is in (ADR 0027). */
  access: ImageAccess;
  apps: App[];
};

/**
 * The Image Fixtures. width, height, bytes and blurDataUrl are what
 * `prepareImage` produces from `source`; `@allonfire/storage`'s
 * `image-fixtures.test.ts` fails when width or height drift (bytes differ
 * between sharp builds, so `scripts/describe-fixtures.ts` refreshes them).
 */
export const IMAGE = {
  HEIC_IN_BACK_OFFICE: {
    access: ImageAccess.PRIVATE,
    alt: { en: "Colour bars", it: "Barre di colore" },
    apps: [App.BACK_OFFICE],
    blurDataUrl:
      "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAwAgCdASoQABAAAsBMJbACdAEPhWC06kzuAAD+hZr2sfYND3fzJj6In/Bt+/f/zmFYP/mM0Vb/EBON/z//TSW9z0cYQIAA",
    bytes: 645,
    height: 64,
    key: "8ce86b0f-3bdd-4489-adf7-bb8faf63adc1.avif",
    source: "colors-no-alpha.heic",
    width: 64,
  },
  IN_BOTH_APPS: {
    access: ImageAccess.PRIVATE,
    alt: {
      en: "A drawn landscape in orange",
      it: "Un paesaggio disegnato in arancione",
    },
    apps: [App.BACK_OFFICE, App.LAURA],
    blurDataUrl:
      "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAAAQAgCdASoQAAsAAsBMJbACdAEQO3MhU4wAAP1QfNeMar+K4j9dFFVe9pQFwX9qaz/TxKQLdhrPMTvD+6P3MkV4/bfjWFgEgAA=",
    bytes: 2025,
    height: 400,
    key: "e15a4a0b-80fc-4609-abac-f948461ba3da.avif",
    source: "photo.avif",
    width: 600,
  },
  PRIVATE_IN_BACK_OFFICE: {
    access: ImageAccess.PRIVATE,
    alt: {
      en: "A red square and a teal circle",
      it: "Un quadrato rosso e un cerchio verde acqua",
    },
    apps: [App.BACK_OFFICE],
    blurDataUrl:
      "data:image/webp;base64,UklGRjgBAABXRUJQVlA4WAoAAAAQAAAADwAACwAAQUxQSJoAAAANgFtt2/Lkft8/fxUvk951BsPdtmAEXSCHipqOio4JaGldO3d3+F6cFSJiAvh/aCj0LmAL+545YLDX+fDm7zTlXQyCvAmotPaczm2LYeIBQjKVbG0uKybum7w+PedHZgxFAUNFryuHt6zF/XfzYryEnD4Di6MB08exqibe4/MocvYCTLd0OZu9wjAFk70pTeyqYOAA9GnpEBEAVlA4IHgAAAAQAgCdASoQAAwAAsBMJbACdDXAOkyAjlJIAOgHBd+V+HMVgh4GUk5SKAgXPPYOulRfZ6eRyARtxvMz9L0GTzs67+5p1MlTsfgJ/o7rfueTgJuAH/yYgvYhKi/7F0DHx2P+l/6e7PzpTa79j/mZ71+r43e0fzjYgAA=",
    bytes: 3141,
    height: 300,
    key: "36699d92-f075-4320-a9da-3b96e19f3d44.avif",
    source: "graphic.png",
    width: 400,
  },
  PRIVATE_IN_LAURA: {
    access: ImageAccess.PRIVATE,
    alt: {
      en: "A drawn landscape in violet",
      it: "Un paesaggio disegnato in viola",
    },
    apps: [App.LAURA],
    blurDataUrl:
      "data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAADQAwCdASoQABUAPtFUo0uoJKMhsAgBABoJbACdACGmj8Wq7yN5RTwA/s1JGVphye+/DFh+VnX8Buxy1mC83IoLeak5UvFbJ3P1HqcWnP+8ODzAKLmC2eR2EN5CWjOuNk0hoo94CiDlHeVPYegYgQcAgAA=",
    bytes: 3096,
    height: 640,
    key: "2e8b75aa-a1fe-42f5-88f3-220ddbbd1d18.avif",
    source: "photo.webp",
    width: 480,
  },
  PUBLIC_IN_BACK_OFFICE: {
    access: ImageAccess.PUBLIC,
    alt: {
      en: "A drawn landscape at dusk",
      it: "Un paesaggio disegnato al tramonto",
    },
    apps: [App.BACK_OFFICE],
    blurDataUrl:
      "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAAAQAgCdASoQAAwAAsBMJbACdAEQYekVVqBwAP6h2zWg0pPPZeOM101dQljtRs+Wz3qF2FUJmm4+1PZ85wo8KTTlL+76PN1ibbCklWcHAAA=",
    bytes: 3180,
    height: 480,
    key: "a0ee02c3-9a8d-4950-a4ae-5974d3a7a1ec.avif",
    source: "photo.jpg",
    width: 640,
  },
} as const satisfies Record<string, FixtureImage>;
