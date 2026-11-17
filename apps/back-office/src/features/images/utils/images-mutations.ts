import type { QueryClient } from "@tanstack/react-query";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import { bulkDeleteMutation } from "@/shared/utils/bulk-delete";
import { invalidateAll } from "@/shared/utils/optimistic-mutation";
import { deleteImages } from "../actions/delete-images";
import { IMAGES } from "../constants/images";
import { imagesPageWithout } from "./images-page-without";

/** The reads an Image change moves: the list and the Storage overview. */
const IMAGES_MOVED = [QUERY.IMAGES.ALL, QUERY.STORAGE.ALL] as const;

/**
 * Deletes the Images named through the `deleteImages` action (a bulk delete:
 * `bulkDeleteMutation`) after taking their rows out of the cached pages, then reads the Images and the Storage overview again,
 * whose numbers moved with the files.
 */
export const deleteImagesMutation = bulkDeleteMutation({
  action: deleteImages,
  invalidates: IMAGES_MOVED,
  mutationKey: MUTATION.IMAGES.DELETE,
  pages: QUERY.IMAGES.PAGES,
  perPageParam: IMAGES.PARAM.PER_PAGE,
  without: imagesPageWithout,
});

/**
 * Reads the Images and the Storage overview again in this browser, after an
 * add or an edit (the action cleared the server's copies): their rows and
 * numbers moved.
 */
export const invalidateImages = (queryClient: QueryClient) =>
  invalidateAll(queryClient, IMAGES_MOVED);
