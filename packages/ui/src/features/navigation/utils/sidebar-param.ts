// nuqs/server: the parsers without nuqs' "use client" entry, so a Server
// Component (the frame's layout) can read them too.
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { createParser } from "nuqs/server";
import { NAVIGATION } from "../constants/navigation";

/**
 * Open by default; the default never shows in the address. Only `true` and
 * `false` are read (`NAVIGATION.OPEN`): nuqs's `parseAsBoolean` reads any other
 * value as `false`, so a hand-edited `?sidebar=x` would collapse the menu.
 * The value is matched against the keys, never looked up in the record, so a
 * name every object has (`constructor`) reads as no value. Replaces the
 * history entry: toggling the menu is not a step Back should undo.
 */
export const sidebarParam = createParser({
  parse: (value) => {
    const open = objectKeys(NAVIGATION.OPEN).find((key) => key === value);
    return open === undefined ? null : NAVIGATION.OPEN[open];
  },
  serialize: String,
})
  .withDefault(true)
  .withOptions({ clearOnDefault: true, history: "replace" });
