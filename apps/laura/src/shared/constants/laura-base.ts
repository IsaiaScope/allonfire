/**
 * What Laura's other constants are built from, kept in a file of its own so
 * the Sections and `LAURA` can each read it without reading one another.
 */
export const LAURA_BASE = {
  /** Laura's own pages' paths, after the locale (Home, the Gallery, is `AUTH.PAGE.HOME`). */
  PAGE: {
    FAVORITES: "/favorites",
    /** Home, with the slash a router and a link need: `AUTH.PAGE.HOME` is empty, and `replace("")` stays where it is. */
    GALLERY: "/",
    LEADERBOARD: "/memory/leaderboard",
    MEMORY: "/memory",
    UPLOAD: "/upload",
  },
} as const;
