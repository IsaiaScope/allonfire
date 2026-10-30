// nuqs/server: the parsers without nuqs' "use client" entry, so a Server
// Component (the frame's layout) can read them too.
import { Role } from "@allonfire/database/enums";
import { createParser } from "nuqs/server";

/** The frame's own values: its forms, its state in the address, the Role seals. */
export const NAVIGATION = {
  FORM: {
    /** The account menu's Sign out submits this form, outside its popup. */
    SIGN_OUT: "sign-out",
  },
  PARAM: {
    /** `false` when the desktop sidebar is collapsed to its icons. */
    SIDEBAR: "sidebar",
  },
  /**
   * The seal pressed beside the User in the account menu: their Role in the
   * Back Office as an office stamp (管理 manage, 利用 use, 閲覧 view).
   */
  ROLE_SEAL: {
    [Role.ADMIN]: "管理",
    [Role.USER]: "利用",
    [Role.VIEWER]: "閲覧",
  } satisfies Record<Role, string>,
} as const;

/** The only values the address may hold for the sidebar. */
const OPEN = new Map([
  [String(true), true],
  [String(false), false],
]);

/**
 * Open by default; the default never shows in the address. Only `true` and
 * `false` are read: nuqs's `parseAsBoolean` reads any other value as
 * `false`, so a hand-edited `?sidebar=x` would collapse the menu. Replaces
 * the history entry: toggling the menu is not a step Back should undo.
 */
export const sidebarParam = createParser({
  parse: (value) => OPEN.get(value) ?? null,
  serialize: String,
})
  .withDefault(true)
  .withOptions({ clearOnDefault: true, history: "replace" });
