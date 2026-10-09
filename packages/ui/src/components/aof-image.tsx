import {
  type ContentLanguage,
  DEFAULT_LANGUAGE,
} from "@allonfire/core/features/i18n/constants/locales";
import { IMAGE_PROXY_PATH } from "@allonfire/storage/features/image/constants/paths";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import Image, { type ImageProps } from "next/image";

/** next/image's loading knobs; `lcp` sets them, so callers cannot disagree. */
type LoadingProps = "fetchPriority" | "loading" | "preload" | "priority";

export type AOFImageProps = Omit<ImageProps, LoadingProps | "sizes"> & {
  /** Required: without it the browser assumes the image fills the viewport. */
  sizes: string;
  /**
   * The page's Largest Contentful Paint image: fetched first and never lazy.
   * At most one per page. Next 16 prefers this over `preload`/`priority`.
   */
  lcp?: boolean;
};

/**
 * next/image with the AOF defaults, for an image that ships with the App (a
 * static import or a `public/` path): lazy unless it is the page's `lcp`, and
 * a static import shows its build-time blur until it loads. Any other
 * next/image prop passes through. An Image from storage is `AOFStorageImage`.
 */
export const AOFImage = ({ lcp = false, ...props }: AOFImageProps) => {
  const { src } = props;
  // A static import of a JPEG, PNG, WebP or AVIF carries a blur; a path
  // string or an SVG does not, and "blur" without one is an error.
  const hasBlur = typeof src === "object" && "blurDataURL" in src;
  return (
    <Image
      placeholder={hasBlur && src.blurDataURL ? "blur" : "empty"}
      {...props}
      data-slot="image"
      fetchPriority={lcp ? "high" : "auto"}
      loading={lcp ? "eager" : "lazy"}
    />
  );
};

/** What AOFStorageImage reads from an API Image: enough to size, blur and describe it. */
export type AOFStorageImageSource = Pick<
  ImageBody,
  "alt" | "blurDataUrl" | "height" | "key" | "width"
>;

/** The props AOFStorageImage sets itself, from the Image. */
type StoredProps =
  | "alt"
  | "blurDataURL"
  | "fill"
  | "height"
  | "placeholder"
  | "src"
  | "width";

export type AOFStorageImageProps = Omit<AOFImageProps, StoredProps> & {
  image: AOFStorageImageSource;
  /** The page's language; picks the alt, English when the Image has none in it. */
  language: ContentLanguage;
};

/**
 * An Image from storage, through the App's `/storage/images` rewrite and its
 * optimizer: its real size (no layout shift), the blur until it loads and the
 * alt in the page's language. Everything else is AOFImage's.
 */
export const AOFStorageImage = ({
  image,
  language,
  ...props
}: AOFStorageImageProps) => (
  <AOFImage
    {...props}
    // Base languages are always stored; another content language can be missing.
    alt={image.alt[language] ?? image.alt[DEFAULT_LANGUAGE]}
    blurDataURL={image.blurDataUrl}
    height={image.height}
    placeholder="blur"
    src={`${IMAGE_PROXY_PATH}/${image.key}`}
    width={image.width}
  />
);
