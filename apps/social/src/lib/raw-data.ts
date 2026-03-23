/** Safely extract a Record from Prisma's `JsonValue` (typed as `unknown`). */
export const safeRawData = (data: unknown): Record<string, unknown> =>
  typeof data === "object" && data !== null
    ? (data as Record<string, unknown>)
    : {};
