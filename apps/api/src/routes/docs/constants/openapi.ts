import { z } from "zod";

export const OPENAPI_TAG = {
  INFRASTRUCTURE: "Infrastructure",
} as const;

export const openApiTagSchema = z.enum(OPENAPI_TAG);
export type OpenApiTag = z.infer<typeof openApiTagSchema>;

/** Names under `components.responses`, for `$ref` from a route. */
export const OPENAPI_RESPONSE = {
  PROBLEM: "Problem",
} as const;

export const OPENAPI_DOC = {
  DESCRIPTION: "Backend for AllOnFire apps.",
  PROBLEM_DESCRIPTION: "RFC 9457 problem document",
  TITLE: "AllOnFire API",
} as const;
