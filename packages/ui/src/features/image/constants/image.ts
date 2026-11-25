import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";

const TOO_LARGE = "tooLarge";
const UNSUPPORTED = "unsupported";
const INVALID = "invalid";

/** What the Apps' Images forms say; `UPLOAD` is adding Images, in any App. */
export const IMAGE = {
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
