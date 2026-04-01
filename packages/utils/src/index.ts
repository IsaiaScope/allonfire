export function objectKeys<T extends object>(obj: T): (keyof T & string)[] {
  return Object.keys(obj) as (keyof T & string)[];
}

export function objectEntries<T extends object>(
  obj: T
): [keyof T & string, T[keyof T & string]][] {
  return Object.entries(obj) as [keyof T & string, T[keyof T & string]][];
}

export function formatErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
