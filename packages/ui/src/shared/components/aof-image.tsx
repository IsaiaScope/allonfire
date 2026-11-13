"use client";

import {
  type HostLanguage,
  I18N,
} from "@allonfire/core/features/i18n/constants/locales";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import Image, { type ImageProps } from "next/image";
import { srcSetLoader } from "../utils/image-server-loader";
import { AOFPictureGuard } from "./aof-picture-guard";

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

/** What `src` ends with so it never equals a link the loader answers. */
const SRC_MARK = "#stored";

/** What AOFStorageImage reads from an API Image: enough to size, blur and describe it. */
export type AOFStorageImageSource = Pick<
  ImageBody,
  "alt" | "blurDataUrl" | "height" | "srcSet" | "width"
>;

/** The props AOFStorageImage sets itself, from the Image. */
type StoredProps =
  | "alt"
  | "blurDataURL"
  | "fill"
  | "height"
  | "loader"
  | "src"
  | "width";

export type AOFStorageImageProps = Omit<AOFImageProps, StoredProps> & {
  image: AOFStorageImageSource;
  /** The page's language; picks the alt, English when the Image has none in it. */
  language: HostLanguage;
};

/**
 * An Image from storage, through the image server: each width next/image
 * asks is the signed link the API answered for it (`srcSetLoader`), never the
 * App's optimizer; its real size (no layout shift), the blur until it loads
 * and the alt in the page's language. Everything else is AOFImage's. A client
 * component: the loader is a function.
 *
 * `placeholder="empty"` is for a caller that paints the blur itself on a tile
 * behind the Image: Next's own blur is a filtered copy of it, so the two
 * differ and the blur would change when the picture loads.
 */
export const AOFStorageImage = ({
  image,
  language,
  placeholder = "blur",
  ...props
}: AOFStorageImageProps) => {
  // Base languages are always stored; another content language can be missing.
  const alt = image.alt[language] ?? image.alt[I18N.DEFAULT_LANGUAGE];
  return (
    <AOFPictureGuard
      alt={alt}
      blurDataUrl={image.blurDataUrl}
      className={props.className}
      resetKey={image.srcSet.map(({ url }) => url).join(" ")}
    >
      {(fail) => (
        <AOFImage
          {...props}
          alt={alt}
          blurDataURL={image.blurDataUrl}
          height={image.height}
          loader={srcSetLoader(image.srcSet)}
          onError={fail}
          placeholder={placeholder}
          // The loader picks by width; next/image needs a src all the same, and
          // warns in development when the loader answers with that very string
          // (an Image stored at one width only does), so it gets a fragment the
          // loader's links lack: a fragment is never sent to the server.
          src={`${image.srcSet.at(-1)?.url ?? ""}${SRC_MARK}`}
          width={image.width}
        />
      )}
    </AOFPictureGuard>
  );
};
