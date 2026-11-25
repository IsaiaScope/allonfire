import type { GalleryPageBody } from "@allonfire/api/features/laura/constants/schemas";
import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import type { HTTP } from "@allonfire/core/features/http/constants/http";
import type { InferResponseType } from "hono/client";
import { HttpResponse, http } from "msw";
import type { api } from "@/features/api/utils/api";
import { deckBody } from "@/features/games/tests/deck-body";
import { leaderboardBody } from "@/features/games/tests/leaderboard-body";

/** Where the browser asks for the Gallery. */
export const GALLERY_URL = `${LOCAL.URL.TEST_API}${API.PATH.LAURA.GALLERY}`;

/** Where the browser asks for the Favorites. */
const FAVORITES_URL = `${LOCAL.URL.TEST_API}${API.PATH.LAURA.FAVORITES}`;

/** Where the browser asks for a Memory deck. */
export const DECK_URL = `${LOCAL.URL.TEST_API}${API.PATH.LAURA.GAMES.DECK}`;

/** Where the browser asks for the Memory leaderboard. */
export const LEADERBOARD_URL = `${LOCAL.URL.TEST_API}${API.PATH.LAURA.GAMES.LEADERBOARD}`;

/** One photo as the Gallery answers it. */
const photo = (
  id: string,
  width: number,
  height: number,
  favorite: boolean
) => ({
  alt: { en: `Photo ${id}`, it: `Foto ${id}` },
  blurDataUrl: "data:image/webp;base64,AAAA",
  favorite,
  height,
  id,
  srcSet: [
    { url: `https://cdn.test/${id}-400.avif`, width: 400 },
    { url: `https://cdn.test/${id}-800.avif`, width: 800 },
  ],
  width,
});

/** The Gallery's first page: three photos, the first a Favorite, and a next page. */
export const GALLERY_PAGE = {
  items: [
    photo("photo-a", 800, 600, true),
    photo("photo-b", 600, 800, false),
    photo("photo-c", 800, 800, false),
  ],
  nextCursor: "1764000000000.photo-c",
} satisfies InferResponseType<
  (typeof api)[typeof API.VERSION.CURRENT][typeof API.SEGMENT.LAURA]["gallery"]["$get"],
  typeof HTTP.STATUS.OK
>;

/** The Gallery's second and last page. */
export const GALLERY_PAGE_TWO = {
  items: [photo("photo-d", 900, 600, false), photo("photo-e", 600, 900, false)],
  nextCursor: null,
} satisfies GalleryPageBody;

/** The Favorites' only page: the Gallery's first photo. */
export const FAVORITES_PAGE = {
  items: [photo("photo-a", 800, 600, true)],
  nextCursor: null,
} satisfies InferResponseType<
  (typeof api)[typeof API.VERSION.CURRENT][typeof API.SEGMENT.LAURA]["favorites"]["$get"],
  typeof HTTP.STATUS.OK
>;

/** What a saved game earns, as the action answers it. */
export const SCORE_BODY = {
  id: "score-1",
  isGlobalBest: false,
  isPersonalBest: true,
  rank: 2,
};

/** The API's answers when a test does not set its own: the first page of each list, a full deck and the leaderboard (a score goes through a server action, which a test mocks). */
export const handlers = [
  http.get(DECK_URL, () => HttpResponse.json(deckBody())),
  http.get(LEADERBOARD_URL, () => HttpResponse.json(leaderboardBody())),

  http.get(GALLERY_URL, () => HttpResponse.json(GALLERY_PAGE)),
  http.get(FAVORITES_URL, () => HttpResponse.json(FAVORITES_PAGE)),
];
