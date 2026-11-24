import type { LauraDeps } from "../utils/deps";

/**
 * Laura's deps for a test: nobody manages, a Profile is always there, both
 * lists are empty and a mark finds its Image. Override what the test is about.
 */
export const stubLauraDeps = (
  overrides: Partial<LauraDeps> = {}
): LauraDeps => ({
  canManage: () => Promise.resolve(false),
  ensureProfile: () => Promise.resolve(true),
  listFavoritesPage: () => Promise.resolve({ images: [], next: null }),
  listGalleryPage: () => Promise.resolve({ images: [], next: null }),
  markFavorite: () => Promise.resolve(true),
  unmarkFavorite: () => Promise.resolve(),
  ...overrides,
});
