import { API } from "@allonfire/api/shared/constants/api";
import { aofRefusal } from "@allonfire/core/features/next/api/utils/aof-refusal";

/** What a refusal is told by: a code the API answers with, or a status it answers with a problem. */
export type ApiRefusalKey =
  | (typeof API.ERROR.CODE)[keyof typeof API.ERROR.CODE]
  | (typeof API.ERROR.STATUS)[number];

/** Why the API refused a form's write, as the form says it (core's `aofRefusal`, over this API's codes). */
export const { refusalOf } = aofRefusal({
  codes: API.ERROR.CODE,
  status: API.ERROR.STATUS,
});
