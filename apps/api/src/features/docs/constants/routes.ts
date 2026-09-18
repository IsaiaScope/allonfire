import type { ValueOf } from "@allonfire/utils/object";

/** Referenced twice each — as a route, and as the URL the other one fetches. */
export const DOCS_ROUTE = {
  OPENAPI: "/openapi.json",
  REFERENCE: "/reference",
} as const;

export type DocsRoute = ValueOf<typeof DOCS_ROUTE>;
