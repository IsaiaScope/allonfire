import { IMAGE_ERROR_CODE } from "@allonfire/storage/features/image/hono/constants/errors";
import type { ErrorCode } from "../constants/error-codes";

// The API documents and translates every code the Image module can throw.
export const covered = IMAGE_ERROR_CODE satisfies Record<string, ErrorCode>;
