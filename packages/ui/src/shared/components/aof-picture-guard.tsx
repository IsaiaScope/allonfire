"use client";

import { type ReactNode, useCallback, useState } from "react";
import type { ComponentPropsWithoutChildren } from "../types/types";
import { cn } from "../utils/utils";

/**
 * Stands where a stored picture is told to draw and cannot: its link expired,
 * or the file is gone (deleted while still on screen). The browser would draw
 * its broken-picture icon there; this keeps the blur the picture loaded behind,
 * as a tile.
 */
const AOFPicturePlaceholder = ({
  alt,
  blurDataUrl,
  className,
  ...props
}: ComponentPropsWithoutChildren<"span"> & {
  alt: string;
  blurDataUrl: string;
}) => (
  <span
    {...props}
    aria-label={alt}
    className={cn("block bg-cover bg-muted", className)}
    data-slot="picture-placeholder"
    role="img"
    style={{ backgroundImage: `url("${blurDataUrl}")` }}
  />
);

/**
 * Draws `children` (handed the `fail` to call from the picture's `onError`)
 * until the picture cannot load, then the blur tile in its place. The failure
 * is kept for `resetKey` only: once the picture's links are new (a list read
 * again) the picture is tried again.
 */
export const AOFPictureGuard = ({
  alt,
  blurDataUrl,
  children,
  className,
  resetKey,
}: {
  alt: string;
  blurDataUrl: string;
  children: (fail: () => void) => ReactNode;
  className?: string | undefined;
  /** What a failure belongs to: the picture's links, as one string. */
  resetKey: string;
}) => {
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const fail = useCallback(() => setFailedFor(resetKey), [resetKey]);
  return failedFor === resetKey ? (
    <AOFPicturePlaceholder
      alt={alt}
      blurDataUrl={blurDataUrl}
      className={className}
    />
  ) : (
    children(fail)
  );
};
