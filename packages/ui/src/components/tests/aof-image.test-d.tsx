import type { AOFImageProps, AOFStorageImageProps } from "../aof-image";

const image = {
  alt: { en: "", it: "" },
  blurDataUrl: "",
  height: 1,
  key: "a.webp",
  width: 1,
};

// sizes is required, so no image ships at 100vw by accident.
// @ts-expect-error sizes is missing
const localNoSizes: AOFImageProps = { alt: "", src: "/a.webp" };
const localPriority: AOFImageProps = {
  alt: "",
  // priority is deprecated in Next 16; lcp replaces it.
  // @ts-expect-error priority is not accepted
  priority: true,
  sizes: "1rem",
  src: "/a.webp",
};
// @ts-expect-error sizes is missing
const noSizes: AOFStorageImageProps = { image, language: "en" };
// @ts-expect-error language is missing
const noLanguage: AOFStorageImageProps = { image, sizes: "100vw" };
const ownSrc: AOFStorageImageProps = {
  image,
  language: "en",
  sizes: "100vw",
  // @ts-expect-error the Image decides its own src
  src: "/a.webp",
};
const partialAlt: AOFStorageImageProps = {
  // @ts-expect-error an alt missing a language is refused
  image: { ...image, alt: { en: "" } },
  language: "en",
  sizes: "100vw",
};

export { localNoSizes, localPriority, noLanguage, noSizes, ownSrc, partialAlt };
