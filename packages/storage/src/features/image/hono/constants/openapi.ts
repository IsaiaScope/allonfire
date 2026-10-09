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
  DELETE_204: "Taken out of `app`, or deleted",
  DELETE_DESCRIPTION: `Signed in. Up to ${MAX_BATCH} ids. With \`app\`: takes the Images out of that App (Admin there; each must be in it) and deletes the ones left in no App. Without: deletes them everywhere (Admin in every App each is in). An Image the User cannot see answers 404, checked across the whole batch before any 403. All or nothing; the stored files go after the rows.`,
  DELETE_SUMMARY: "Take Images out of an App, or delete them",
  GET_200: "The Image",
  GET_DESCRIPTION:
    "No sign-in needed. An Image public in some App, or in an App the User enters; any other answers 404, not 403, so its id stays hidden.",
  GET_SUMMARY: "Get an Image",
  LIST_200: "One page of Images; `nextCursor` is null on the last page",
  LIST_DESCRIPTION: `No sign-in needed. The Images visible in \`app\` (in any App when it is left out): placed there, and public or in an App the User enters. Never 403: someone who cannot enter \`app\` gets its public Images. Newest upload first, ${DEFAULT_LIST_LIMIT} per page (\`limit\` up to ${MAX_LIST_LIMIT}). Send \`nextCursor\` back as \`cursor\` for the next page.`,
  LIST_SUMMARY: "List Images",
  PATCH_200: "The updated Images",
  PATCH_DESCRIPTION: `Signed in. Up to ${MAX_BATCH} changes, each Image once, each an \`id\` with \`apps\` (the full new list, each App once), \`alt\` or both. A placement added, removed or switched public needs the Admin Role in its App; \`alt\`, which every App shows, needs it in every App the Image is in. A \`public\` left out keeps a placement's own and makes a new one private; \`alt\` needs every language. An Image the User cannot see answers 404, checked across the whole batch before any 403. All or nothing.`,
  PATCH_SUMMARY: "Place Images in Apps or change their alt",
  UPLOAD_201: "The new Images, in file order",
  UPLOAD_DESCRIPTION: `Signed in, Admin in every App named. multipart/form-data: up to ${MAX_FILES_PER_UPLOAD} \`file\` parts and one \`meta\` JSON part, \`[{ apps: [{ app, public? }], alt }]\` in file order, at least one App each, each App once, \`public\` false when left out. JPEG, PNG, WebP, AVIF or HEIC in; each file is stored as AVIF with a blur placeholder. Limits: ${MAX_FILE_BYTES / BYTES_PER_MIB} MiB a file, ${MAX_UPLOAD_BYTES / BYTES_PER_MIB} MiB a request, ${MAX_INPUT_MEGAPIXELS} megapixels, ${UPLOAD_TIMEOUT_MS / MS_PER_MINUTE} minutes. All or nothing: one bad file rejects the batch.`,
  UPLOAD_SUMMARY: "Upload Images",
} as const;
