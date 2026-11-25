import { QUERY } from "./query";

/** Laura's mutation keys: one per kind of change (a second change to the same photo waits for the first). */
export const MUTATION = {
  GALLERY: {
    /** Marks or clears one photo as a Favorite. */
    FAVORITE: (imageId: string) =>
      [...QUERY.GALLERY.ALL, "favorite", imageId] as const,
    /** Removes a photo from Laura. */
    REMOVE: [...QUERY.GALLERY.ALL, "remove"] as const,
  },
  GAMES: {
    /** Saves a finished game. */
    SUBMIT_SCORE: [...QUERY.GAMES.ALL, "submit-score"] as const,
  },
} as const;
