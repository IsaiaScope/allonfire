import { z } from "zod";

export const OPENAPI_TAG = {
  INFRASTRUCTURE: "Infrastructure",
} as const;

export const openApiTagSchema = z.enum(OPENAPI_TAG);
export type OpenApiTag = z.infer<typeof openApiTagSchema>;

export const OPENAPI_DOC = {
  DESCRIPTION: "Backend for AllOnFire apps.",
  TITLE: "AllOnFire API",
} as const;
