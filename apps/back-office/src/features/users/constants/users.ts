/** The Back Office's Users list: its tunables, each written once. */
export const USERS = {
  /** Why the Add a User action refused, each with its message over the form. */
  ADD_ERROR: { FAILED: "failed", INVALID: "invalid", TAKEN: "taken" },
  /** Brushed in the Add button: 乗, to board (the brush face carries it). */
  ADD_KANJI: "乗",
  /** Brushed in the Cancel button: 戻, to go back (the brush face carries it). */
  CANCEL_KANJI: "戻",
  /**
   * How the address changes: a search replaces the history entry (Back should
   * not walk through each keystroke); a page or page size pushes one.
   */
  HISTORY: {
    PAGE: { clearOnDefault: true, history: "push" },
    SEARCH: { clearOnDefault: true, history: "replace" },
  },
  /** A Role row's choice for an App the new User is not in. */
  NO_ROLE: "none",
  /** The Users Section's own pages, under its path. */
  PATH: { NEW: "/new" },
  /** Asks again this many times after a server or network failure. */
  RETRIES: 1,
  /** How long typing rests before the address changes. */
  TYPING_REST_MS: 300,
} as const;
