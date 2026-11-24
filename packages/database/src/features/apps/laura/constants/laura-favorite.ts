/** What Laura's Favorites and Profiles agree on. */
export const LAURA_FAVORITE = {
  /**
   * The advisory lock every writer of the master list and of the Profiles'
   * copies takes first (`lockFavorites`), so a first-use copy never misses an
   * Admin's mark made at the same moment. A fixed number, unique in this database.
   */
  LOCK_KEY: 4_201_190_001,
} as const;
