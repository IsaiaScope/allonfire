import type { LauraDeps } from "../utils/deps";

/**
 * Laura's deps for a test: nobody manages, every Member plays, a Profile is
 * always there, every list is empty, no Avatar is signed and a mark finds its
 * Image. Override what the test is about.
 */
export const stubLauraDeps = (
  overrides: Partial<LauraDeps> = {}
): LauraDeps => ({
  avatarLink: () => null,
  canManage: () => Promise.resolve(false),
  canPlay: () => Promise.resolve(true),
  ensureProfile: () => Promise.resolve(true),
  listFavoritesPage: () => Promise.resolve({ images: [], next: null }),
  listGalleryPage: () => Promise.resolve({ images: [], next: null }),
  markFavorite: () => Promise.resolve(true),
  memoryLeaderboard: () => Promise.resolve([]),
  memoryStats: () =>
    Promise.resolve({
      averageMs: null,
      fastestMs: null,
      fewestMoves: null,
      totalGames: 0,
      uniquePlayers: 0,
    }),
  randomImages: () => Promise.resolve([]),
  submitMemoryScore: () =>
    Promise.resolve({
      saved: {
        id: "score-1",
        isGlobalBest: true,
        isPersonalBest: true,
        rank: 1,
      },
    }),
  unmarkFavorite: () => Promise.resolve(),
  userMemoryStats: () =>
    Promise.resolve({
      averageMs: null,
      bestMoves: null,
      bestTimeMs: null,
      rank: null,
      totalGames: 0,
    }),
  ...overrides,
});
