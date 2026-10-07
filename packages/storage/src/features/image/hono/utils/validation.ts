import {
  invalidHook,
  type StandardIssue,
  validationError,
} from "@allonfire/core/features/errors/coded-error";
import { IMAGE_ERROR_CODE } from "../constants/errors";

/** The host's 400 for these issues, each field named. */
export const invalid = (issues: readonly StandardIssue[]) =>
  validationError(IMAGE_ERROR_CODE.VALIDATION_FAILED, issues);

/** `sValidator`'s hook: a failed parse becomes the host's 400. */
export const throwOnInvalid = invalidHook(IMAGE_ERROR_CODE.VALIDATION_FAILED);
