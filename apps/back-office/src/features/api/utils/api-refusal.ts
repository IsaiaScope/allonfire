import { API } from "@allonfire/api/shared/constants/api";
import { aofRefusal } from "@allonfire/core/features/next/api/utils/aof-refusal";

/** Why the API refused a form's write, as the form says it (core's `aofRefusal`, over this API's codes). */
export const { refusalOf } = aofRefusal({
  codes: API.ERROR.CODE,
  status: API.ERROR.STATUS,
});
