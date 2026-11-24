import { z } from "zod";
import { SEARCH } from "./constants/search";

/** Where a keyset page ends: the last row's time and id. */
export type KeysetPosition = { at: Date; id: string };

/**
 * An opaque, URL-safe cursor for a list paged by keyset (`created` time, then
 * id), such as an infinite feed: `<epoch ms>.<id>` of the last row sent. Unlike
 * a page number it stays exact when a row is added or removed between two
 * pages. `schema` reads it back and refuses anything else, so a hand-edited
 * address is a validation failure, never a database error.
 */
export const keysetCursor = {
  encode: ({ at, id }: KeysetPosition) => `${at.getTime()}.${id}`,
  schema: z
    .string()
    .max(SEARCH.CURSOR.MAX_LENGTH)
    .transform((text, ctx): KeysetPosition => {
      if (!SEARCH.CURSOR.PATTERN.test(text)) {
        ctx.addIssue({ code: "custom", message: "Not a keyset cursor" });
        return z.NEVER;
      }
      const [epoch = "", id = ""] = text.split(".");
      const at = new Date(Number(epoch));
      // 16 digits can pass the largest Date (8.64e15), which is no time.
      if (Number.isNaN(at.getTime())) {
        ctx.addIssue({ code: "custom", message: "Not a keyset cursor" });
        return z.NEVER;
      }
      return { at, id };
    }),
};
