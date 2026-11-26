import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";

const TOO_LARGE = "tooLarge";
const UNSUPPORTED = "unsupported";
const INVALID = "invalid";

/** What the Apps' Images forms say; `UPLOAD` is adding Images, in any App. */
export const IMAGE = {
  /** What the Export's Download and Share (`AOFExportActions`) say and ask the browser. */
  EXPORT: {
    /** A DOMException's name when the person closes the share sheet. */
    ABORT_ERROR: "AbortError",
    /** A DOMException's name when `share()` is not inside a recent tap: iOS refuses one asked for after a slow fetch. */
    NOT_ALLOWED_ERROR: "NotAllowedError",
    /** The empty file `canShare` is asked about: only its type and name matter. */
    PROBE_NAME: "export.jpg",
    /** How a Download or a share ended: `CANCELLED` is the person's own doing, so nothing is said; `BLOCKED` is a sheet that wants a new tap; `GONE` is an Image the API no longer finds. */
    RESULT: {
      BLOCKED: "blocked",
      CANCELLED: "cancelled",
      DONE: "done",
      FAILED: "failed",
      GONE: "gone",
    },
    /** How long a saved file's own address lives: freed at once, the browser can lose the save. */
    REVOKE_AFTER_MS: UNIT.MS_PER_MINUTE,
  },
  UPLOAD: {
    /** Why adding Images failed, as the form says it (each is a translation key). */
    ERROR: {
      FAILED: "failed",
      INVALID,
      /** No Session, or one the API no longer lets add Images: sign in again. */
      REFUSED: "refused",
      /** A file or the request is over the API's size limits (413). */
      TOO_LARGE,
      /** A file the API cannot read as a picture (415 or 400). */
      UNSUPPORTED,
    },
    /** What a saved add tells the form to do. */
    NOTICE: { ADDED: "added" },
    /** The error an add is told by each of the API's codes (`refusalOf`'s `known`). */
    REFUSAL: {
      [ERROR.CODE.BAD_REQUEST]: INVALID,
      [STORED_IMAGE.ERROR_CODE.IMAGE_TOO_LARGE]: TOO_LARGE,
      [STORED_IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE]: UNSUPPORTED,
    },
  },
} as const;
