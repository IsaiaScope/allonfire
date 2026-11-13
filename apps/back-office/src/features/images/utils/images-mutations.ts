import type { QueryClient } from "@tanstack/react-query";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import {
  bulkDeleteMutation,
  useBeingDeleted,
} from "@/shared/utils/bulk-delete";
import { deleteImages } from "../actions/delete-images";

/**
 * Deletes the Images named through the `deleteImages` action (a bulk delete:
 * `bulkDeleteMutation`), then reads the Images and the Storage overview again,
 * whose numbers moved with the files.
 */
export const deleteImagesMutation = bulkDeleteMutation({
  action: deleteImages,
  invalidates: [QUERY.IMAGES.ALL, QUERY.STORAGE.ALL],
  mutationKey: MUTATION.IMAGES.DELETE,
});

/** The Images a deletion is on its way for: their rows fade at once. */
export const useImagesBeingDeleted = () =>
  useBeingDeleted(MUTATION.IMAGES.DELETE);

/**
 * Reads the Images and the Storage overview again in this browser, after an
 * add or an edit (the action cleared the server's copies): their rows and
 * numbers moved.
 */
export const invalidateImages = async (client: QueryClient) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: QUERY.IMAGES.ALL }),
    client.invalidateQueries({ queryKey: QUERY.STORAGE.ALL }),
  ]);
};
