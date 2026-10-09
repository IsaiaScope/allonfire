import type { AOFStorageImageSource } from "@allonfire/ui/components/aof-image";

/**
 * The sign-in photograph, a Back office Image in storage: 'A train traveling
 * through a city at night' by mos design on Unsplash (Unsplash License),
 * https://unsplash.com/photos/R1OKYQkalRc. Decorative, so its alt is empty.
 *
 * ponytail: the key is the one the local MinIO holds. Each environment needs
 * this Image uploaded (POST /v1/images, apps [{ app: BACK_OFFICE }]) and its key here,
 * until the page can look an Image up by name without a session.
 */
export const SIGN_IN_IMAGE = {
  alt: { en: "", it: "" },
  blurDataUrl:
    "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAADwAQCdASoQAAsAAsBMJYgCdAEN+sKtrQAA/vWhtCO/N4R3q7Aco2ZHW5IlRk9T+ovl+ilWxYJah0qPH744DpG6T+ZRPHEgAAA=",
  height: 1600,
  key: "b47ee13a-b6c7-4b49-91bd-31a22653d2b5.webp",
  width: 2400,
} as const satisfies AOFStorageImageSource;
