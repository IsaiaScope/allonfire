import { createHmac } from "node:crypto";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { env } from "../../environment/environment";
import type { SignedLink } from "../image/constants/schemas";
import { IMAGE_SERVER } from "./constants/image-server";

const MS_PER_HOUR = UNIT.SECONDS_PER_HOUR * UNIT.MS_PER_SECOND;

/**
 * imgproxy's signature of `path`: HMAC-SHA256 over the salt then the path,
 * keyed by the key (both hex), base64url without padding.
 */
export const signPath = (
  path: string,
  { key, salt }: { key: string; salt: string }
): string =>
  createHmac("sha256", Buffer.from(key, "hex"))
    .update(Buffer.from(salt, "hex"))
    .update(path)
    .digest("base64url");

type PictureLinkOptions = {
  /** The bucket holding it; the package's own by default. */
  bucket?: string | undefined;
  key: string;
  width: number;
  /** When the link stops working; none, and it never does (a public picture). */
  expiresAt?: Date | undefined;
};

/**
 * A signed image-server link to the stored picture `key`, fitted to `width`
 * (never taller than it is), in the format the browser takes (AVIF, else
 * WebP). Changing any part of it, the width included, breaks the signature.
 */
export const pictureLink = ({
  bucket = env.STORAGE_BUCKET,
  expiresAt,
  key,
  width,
}: PictureLinkOptions): string => {
  const expiry = expiresAt
    ? `/exp:${Math.floor(expiresAt.getTime() / UNIT.MS_PER_SECOND)}`
    : "";
  const path = `/rs:fit:${width}:0${expiry}/plain/s3://${bucket}/${key}`;
  const signature = signPath(path, {
    key: env.STORAGE_IMAGE_SERVER_KEY,
    salt: env.STORAGE_IMAGE_SERVER_SALT,
  });
  return `${env.STORAGE_IMAGE_SERVER_URL}/${signature}${path}`;
};

/**
 * When a private picture's link stops working: the end of the hour after the
 * one `now` is in, so a link stays the same for a whole hour (a page, a cache
 * and the browser all see one address) and lasts at least an hour.
 */
export const privateLinkExpiry = (now: Date): Date =>
  new Date(
    (Math.ceil(now.getTime() / MS_PER_HOUR) + IMAGE_SERVER.PRIVATE_LINK_HOURS) *
      MS_PER_HOUR
  );

/** One signed link per `IMAGE_SERVER.WIDTHS`, for next/image's `srcset`. */
export const pictureSrcSet = (key: string, expiresAt?: Date): SignedLink[] =>
  IMAGE_SERVER.WIDTHS.map((width) => ({
    url: pictureLink({ expiresAt, key, width }),
    width,
  }));
