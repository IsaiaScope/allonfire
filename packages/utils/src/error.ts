/** Narrows an unknown thrown value to a message, without assuming it is an `Error`. */
export function formatErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
