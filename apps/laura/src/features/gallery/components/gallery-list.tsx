import { hasSectionRole } from "@allonfire/auth/features/next/utils/has-section-role";
import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import { Role } from "@allonfire/database/enums";
import type { DehydratedState } from "@tanstack/react-query";
import type { GallerySource } from "../constants/gallery-schema";
import { GalleryFeed } from "./gallery-feed";

/**
 * A list's feed with its first page already in it: the page's own read
 * (`hydration`, kept in the visitor's browser), handed to the feed through the
 * boundary that never puts a feed back to its first page, and whether the
 * Session's User is an Admin, who sets the heart and removes photos. That is
 * drawn only: the API judges every write itself.
 */
export const GalleryList = async ({
  hydration,
  source,
}: {
  hydration: () => Promise<DehydratedState>;
  source: GallerySource;
}) => {
  const canMark = hasSectionRole(await requireAppSession(), Role.ADMIN);
  return (
    <AOFHydratedBoundary hydration={hydration} onlyMissing>
      <GalleryFeed canMark={canMark} source={source} />
    </AOFHydratedBoundary>
  );
};
