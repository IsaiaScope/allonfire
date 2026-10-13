import { z } from "zod";

/** What the API's own OpenAPI document says about itself. */
export const OPENAPI = {
  DOC: {
    DESCRIPTION: "Backend for AllOnFire apps.",
    PROBLEM_DESCRIPTION: "RFC 9457 problem document",
    TITLE: "AllOnFire API",
  },
  TAG: {
    INFRASTRUCTURE: "Infrastructure",
  },
} as const;

export const openApiTagSchema = z.enum(OPENAPI.TAG);
export type OpenApiTag = z.infer<typeof openApiTagSchema>;
