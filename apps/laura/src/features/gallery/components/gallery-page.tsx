import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { GalleryFeedSkeleton } from "./gallery-skeleton";

/**
 * A list of photos' page, the container the grid's columns and rows measure: the Section's page with its name for screen readers
 * (the header's breadcrumb names it on screen), and the feed behind the
 * skeleton, so the page itself is in the static shell and only the photos
 * wait. Edge to edge, for the photos to be the page: the sides keep what the
 * screen needs clear (a notch, the corners) and the rest is the tiles' own
 * gutter, so the space around the grid is the space between its tiles. It is
 * ui's `edge` page, which clears the notch once (beside the docked sidebar the
 * frame already has).
 */
export const GalleryPage = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <AOFSectionPage width="edge">
    <h1 className="sr-only">{title}</h1>
    <Suspense fallback={<GalleryFeedSkeleton />}>{children}</Suspense>
  </AOFSectionPage>
);
