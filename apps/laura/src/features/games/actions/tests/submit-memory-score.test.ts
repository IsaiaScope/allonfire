// @module-tag unit

import { LAURA as API_LAURA } from "@allonfire/api/features/laura/constants/laura";
import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  FAKE_API,
  resetFakeApi,
} from "@allonfire/core/features/next/api/tests/fake-api";
import { updateTag } from "next/cache";
import { GAMES } from "../../constants/games";
import { submitMemoryScore } from "../submit-memory-score";

const SCORE = { moves: 8, timeMs: 40_000 };
const SAVED = {
  id: "score-1",
  isGlobalBest: true,
  isPersonalBest: true,
  rank: 1,
};

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock(
  "next/cache",
  () => import("@allonfire/ui/shared/tests/next-cache-mock")
);

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("submitMemoryScore", () => {
  it("posts the game, updates the leaderboard's tag once and answers the score", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, {
      body: SAVED,
      status: HTTP.STATUS.CREATED,
    });
    expect(await submitMemoryScore(SCORE)).toEqual({ ok: true, score: SAVED });
    expect(FAKE_API.sent).toEqual([
      {
        body: SCORE,
        method: HTTP.METHOD.POST,
        path: API.PATH.LAURA.GAMES.SCORES,
      },
    ]);
    expect(updateTag).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith(GAMES.CACHE.TAG);
  });

  it("answers IMPLAUSIBLE to a coded refusal of the game, and updates no tag", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, {
      code: API_LAURA.GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE,
      status: HTTP.STATUS.BAD_REQUEST,
    });
    expect(await submitMemoryScore(SCORE)).toEqual({
      ok: false,
      reason: GAMES.SUBMIT_ERROR.IMPLAUSIBLE,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it.each([
    [HTTP.STATUS.UNAUTHORIZED, GAMES.SUBMIT_ERROR.REFUSED],
    [HTTP.STATUS.FORBIDDEN, GAMES.SUBMIT_ERROR.REFUSED],
    [HTTP.STATUS.INTERNAL_SERVER_ERROR, GAMES.SUBMIT_ERROR.FAILED],
  ])("answers %i as %s, and updates no tag", async (status, reason) => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status });
    expect(await submitMemoryScore(SCORE)).toEqual({ ok: false, reason });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("answers FAILED when the API cannot be reached, never throws", async () => {
    FAKE_API.unreachable.add(HTTP.METHOD.POST);
    expect(await submitMemoryScore(SCORE)).toEqual({
      ok: false,
      reason: GAMES.SUBMIT_ERROR.FAILED,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
