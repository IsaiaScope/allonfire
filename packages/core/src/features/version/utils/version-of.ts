import { createHash } from "node:crypto";
import { VERSION } from "../constants/version";

/**
 * A resource's version: a hash of the parts a save could overwrite, so a
 * save carrying an older one is refused (`resourceChanged`). Each resource
 * decides its parts; a part never holds `VERSION.PART_SEPARATOR`, so
 * `("ab", "c")` and `("a", "bc")` differ. Server only.
 */
export const versionOf = (...parts: readonly string[]): string =>
  createHash(VERSION.HASH)
    .update(parts.join(VERSION.PART_SEPARATOR))
    .digest("hex");
