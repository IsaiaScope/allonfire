import { API } from "@allonfire/api/shared/constants/api";
import { aofRefusal } from "@allonfire/core/features/next/api/utils/aof-refusal";

// jscpd:ignore-start
// The Back Office holds the same file: only an App knows its own API's codes.
/** Why the API refused a write, as the screen says it (core's `aofRefusal`, over this API's codes). */
export const { refusalOf } = aofRefusal({
  codes: API.ERROR.CODE,
  status: API.ERROR.STATUS,
});
// jscpd:ignore-end
