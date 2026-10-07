import {
  BYTES_PER_MIB,
  MS_PER_MINUTE,
} from "@allonfire/core/shared/constants/units";
import { MAX_INPUT_MEGAPIXELS } from "../../prepare/constants/limits";
import {
  DEFAULT_LIST_LIMIT,
  MAX_BATCH,
  MAX_FILE_BYTES,
  MAX_FILES_PER_UPLOAD,
  MAX_LIST_LIMIT,
  MAX_UPLOAD_BYTES,
  UPLOAD_TIMEOUT_MS,
} from "./limits";

/** The tag the Image module's routes appear under. */
export const IMAGE_OPENAPI_TAG = "Image";

/**
 * What the docs say about each route. Every number comes from the limit that
 * enforces it, so the text cannot promise a limit the route does not keep.
 */
export const IMAGE_ROUTE_DOC = {
  DELETE_204: "Deleted",
  DELETE_DESCRIPTION: `ADMIN only. Up to ${MAX_BATCH} ids. All or nothing: one unknown id answers 404 and deletes nothing. The stored files go after the rows.`,
  DELETE_SUMMARY: "Delete Images",
  GET_200: "The Image",
  GET_DESCRIPTION:
    "Any signed-in User. An Image from an App the User is not allowed into answers 404, not 403, so its id stays hidden.",
  GET_SUMMARY: "Get an Image",
  LIST_200: "One page of Images; `nextCursor` is null on the last page",
  LIST_DESCRIPTION: `Any signed-in User allowed into \`app\`; anyone else gets 403. The App's Images plus the ones every App shows, newest first, ${DEFAULT_LIST_LIMIT} per page (\`limit\` up to ${MAX_LIST_LIMIT}). Send \`nextCursor\` back as \`cursor\` for the next page.`,
  LIST_SUMMARY: "List an App's Images",
  PATCH_200: "The updated Images",
  PATCH_DESCRIPTION: `ADMIN only. Up to ${MAX_BATCH} changes, each an \`id\` with a new \`app\`, \`alt\` or both; \`alt\` needs every language. All or nothing: one unknown id answers 404 and changes nothing.`,
  PATCH_SUMMARY: "Move Images or change their alt",
  UPLOAD_201: "The new Images, in file order",
  UPLOAD_DESCRIPTION: `ADMIN only. multipart/form-data: up to ${MAX_FILES_PER_UPLOAD} \`file\` parts and one \`meta\` JSON part, \`[{ app, alt }]\` in file order. JPEG, PNG, WebP, AVIF or HEIC in; each file is stored as AVIF with a blur placeholder. Limits: ${MAX_FILE_BYTES / BYTES_PER_MIB} MiB a file, ${MAX_UPLOAD_BYTES / BYTES_PER_MIB} MiB a request, ${MAX_INPUT_MEGAPIXELS} megapixels, ${UPLOAD_TIMEOUT_MS / MS_PER_MINUTE} minutes. All or nothing: one bad file rejects the batch.`,
  UPLOAD_SUMMARY: "Upload Images",
} as const;
