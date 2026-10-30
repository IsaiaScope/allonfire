import { z } from "zod";
import { type Json, parseJsonWith, stringifyJson } from "./json";

/** The browser's two Web Storage areas, by their global's name. */
export const STORAGE_AREA = {
  LOCAL: "localStorage",
  SESSION: "sessionStorage",
} as const;

export const storageAreaSchema = z.enum(STORAGE_AREA);
export type StorageArea = z.infer<typeof storageAreaSchema>;

/**
 * One value kept in the browser's Web Storage under `key`, as JSON, typed by
 * its zod schema both ways: `write` takes the schema's type, `read` gives it
 * back checked. Never throws: no storage (the server), storage that refuses
 * (a private window, a full quota), storage out of reach (blocked site data,
 * where merely reading `window.localStorage` throws), or text the schema
 * refuses all read as `null`, and a write is forgotten. So nothing kept here
 * may be needed: it is a convenience a visitor can lose.
 */
export const storageItem = <S extends z.ZodType>(
  key: string,
  schema: S,
  area: StorageArea = STORAGE_AREA.LOCAL
) => {
  // Reached inside each try, never captured: the global itself can throw.
  const storage = () => globalThis[area];
  return {
    read: (): z.infer<S> | null => {
      try {
        const text = storage().getItem(key);
        return text === null ? null : parseJsonWith(text, schema);
      } catch {
        return null;
      }
    },
    remove: () => {
      try {
        storage().removeItem(key);
      } catch {
        // ponytail: nothing kept, nothing to remove.
      }
    },
    write: <T extends z.infer<S>>(value: T & Json<T>) => {
      try {
        storage().setItem(key, stringifyJson<T>(value));
      } catch {
        // ponytail: nowhere to keep it; the next read finds nothing.
      }
    },
  };
};
