// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { answeringApi } from "@allonfire/core/features/next/api/tests/answering-api";
import {
  dehydratedData,
  sentCookie,
  stubFetchJson,
} from "@allonfire/ui/shared/tests/fetch-stub";
import {
  readSessionCookie,
  SESSION_COOKIE,
} from "@allonfire/ui/shared/tests/session-cookie-mock";
import { hc } from "hono/client";
import { cacheLife, cacheTag } from "next/cache";
import { QUERY } from "@/shared/constants/query";
import { ONLY_SERVER_FAILURES, retryAnswers } from "@/shared/tests/retry-rule";
import { GAMES } from "../../constants/games";
import { leaderboardBody } from "../../tests/leaderboard-body";
import { leaderboardHydration } from "../leaderboard-hydration";
import {
  fetchLeaderboard,
  leaderboardKey,
  leaderboardQuery,
} from "../leaderboard-queries";

vi.mock(
  "next/cache",
  () => import("@allonfire/ui/shared/tests/next-cache-mock")
);
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@allonfire/ui/shared/tests/session-cookie-mock")
);

const answering = (body: unknown) =>
  answeringApi(hc<ApiType>, LOCAL.URL.TEST_API, body);
const { client: api } = answering({});

describe("leaderboardQuery", () => {
  it("is keyed so the server's copy and the client's read share it", () => {
    expect(leaderboardQuery(api).queryKey).toEqual(QUERY.GAMES.LEADERBOARD);
    expect(leaderboardKey).toEqual(QUERY.GAMES.LEADERBOARD);
  });

  it("is never stale, so only a score asks for it again", () => {
    expect(leaderboardQuery(api).staleTime).toBe("static");
  });

  it("tells its failure on the page, never in a toast", () => {
    expect(leaderboardQuery(api).meta).toEqual({ errorToast: false });
  });

  it("does not ask again after the API refused, and asks once more after a server failure", () => {
    expect(
      retryAnswers(leaderboardQuery(api).retry, GAMES.LEADERBOARD.RETRIES)
    ).toEqual(ONLY_SERVER_FAILURES);
  });
});

describe("fetchLeaderboard", () => {
  it("answers the API's body", async () => {
    const body = leaderboardBody();
    expect(await fetchLeaderboard(answering(body).client)).toEqual(body);
  });
});

describe("leaderboardHydration", () => {
  it("reads the board as the Session's cookie and dehydrates it under the key, tagged and kept", async () => {
    const body = leaderboardBody();
    const fetch = stubFetchJson(body);
    const state = await leaderboardHydration();
    expect(dehydratedData(state)).toEqual([
      { data: body, queryKey: QUERY.GAMES.LEADERBOARD },
    ]);
    expect(cacheTag).toHaveBeenCalledWith(GAMES.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(GAMES.CACHE.LIFE);
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("throws when refused, so nothing empty is kept", async () => {
    vi.mocked(readSessionCookie).mockResolvedValueOnce("");
    stubFetchJson({}, HTTP.STATUS.UNAUTHORIZED);
    await expect(leaderboardHydration()).rejects.toThrow();
  });
});
