import { objectEntries } from "@allonfire/core/shared/utils/object";
import { API } from "../constants/api";
import type { ErrorCode, ErrorStatus } from "../constants/error";

/** The codes sent with `status`, in `API.ERROR.CODE` order. */
export const codesFor = (status: ErrorStatus): ErrorCode[] =>
  objectEntries(API.ERROR.STATUS_OF_CODE).flatMap(([code, codeStatus]) =>
    codeStatus === status ? [code] : []
  );
