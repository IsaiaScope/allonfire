import { IMAGE } from "./images";

/**
 * The Favorite Fixture: an Image in both Apps, on the Admins' master list. The
 * seed writes it after the Images (`upsertImage` replaces placements, which
 * removes a Favorite with the old one). No Profile is seeded: a Laura User's
 * Profile is created, with a copy of the master, the first time they use Laura.
 */
export const FAVORITE = {
  IMAGE: IMAGE.IN_BOTH_APPS,
} as const;
