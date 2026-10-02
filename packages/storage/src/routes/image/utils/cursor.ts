import type { ImageCursor } from "@allonfire/database/features/image/image.service";
import { z } from "zod";
import { jsonFrom } from "./json";

const cursorFieldsSchema = z.object({
  createdAt: z.iso.datetime().transform((value) => new Date(value)),
  id: z.string().min(1),
});

/** Opaque to the client: base64url JSON of the last Image's sort key. */
export const encodeCursor = ({ createdAt, id }: ImageCursor): string =>
  Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id })
  ).toString("base64url");

/** The query's `cursor`, decoded; anything else is the client's 400. */
export const cursorSchema = z
  .string()
  .transform((text) => Buffer.from(text, "base64url").toString("utf8"))
  .pipe(jsonFrom("cursor is malformed"))
  .pipe(cursorFieldsSchema);
