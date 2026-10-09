import {
  BYTES_PER_MIB,
  MS_PER_MINUTE,
} from "@allonfire/core/shared/constants/units";

/** One file; larger is a 413 naming this limit. */
export const MAX_FILE_BYTES = 20 * BYTES_PER_MIB;
/** One upload request, every file and the meta part together. */
export const MAX_UPLOAD_BYTES = 100 * BYTES_PER_MIB;
export const MAX_FILES_PER_UPLOAD = 20;
/** Items in one PATCH or DELETE. */
export const MAX_BATCH = 100;
/**
 * The upload's own time budget, in place of the API-wide 30 s: a 503 there
 * would not stop the handler, so the batch would still land and a retry would
 * store it twice.
 */
export const UPLOAD_TIMEOUT_MS = 5 * MS_PER_MINUTE;
export const DEFAULT_LIST_LIMIT = 30;
export const MAX_LIST_LIMIT = 100;
