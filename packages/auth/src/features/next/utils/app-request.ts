import { HTTP } from "@allonfire/core/features/http/constants/http";
import { forwardedHeaders } from "@allonfire/core/features/next/api/utils/visitor-headers";
import { headers } from "next/headers";
import { nextAuthEnv } from "../../../environment/next-environment";
import { AUTH } from "../../../shared/constants/auth";

/** A form field as text; a missing field or a file reads as empty. */
export const formText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

/**
 * The visitor's forwarded headers, naming this App and, when given, the
 * page's language, so what the API answers (an email) wears the App's look
 * and the reader's words.
 */
export const appHeaders = async (language?: string) => {
  const requestHeaders = new Headers(forwardedHeaders(await headers()));
  requestHeaders.set(AUTH.HEADER.APP, nextAuthEnv.AUTH_APP);
  if (language) {
    requestHeaders.set(HTTP.HEADER.ACCEPT_LANGUAGE, language);
  }
  return requestHeaders;
};
