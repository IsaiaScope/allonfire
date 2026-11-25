// @module-tag unit

import { GAMES } from "../../constants/games";
import { submitViewOf } from "../submit-view";

const SAVED = {
  id: "score-1",
  isGlobalBest: true,
  isPersonalBest: false,
  rank: 2,
};
const NOTHING = { data: undefined, isError: false, isPending: false };

describe("submitViewOf", () => {
  it("is idle before a game is sent", () => {
    expect(submitViewOf(NOTHING)).toEqual({ state: "idle" });
  });

  it("is submitting while the save is out, whatever an earlier try said", () => {
    expect(
      submitViewOf({
        data: { ok: false, reason: GAMES.SUBMIT_ERROR.FAILED },
        isError: false,
        isPending: true,
      })
    ).toEqual({ state: "submitting" });
  });

  it("carries the saved score", () => {
    expect(
      submitViewOf({ ...NOTHING, data: { ok: true, score: SAVED } })
    ).toEqual({ score: SAVED, state: "saved" });
  });

  it.each([
    [GAMES.SUBMIT_ERROR.IMPLAUSIBLE, "notRecorded"],
    [GAMES.SUBMIT_ERROR.FAILED, "failed"],
    [GAMES.SUBMIT_ERROR.REFUSED, "refused"],
  ])("tells a refusal of %s as %s", (reason, state) => {
    expect(submitViewOf({ ...NOTHING, data: { ok: false, reason } })).toEqual({
      state,
    });
  });

  it("tells a throw that escaped the action as a failure that can be tried again", () => {
    expect(submitViewOf({ ...NOTHING, isError: true })).toEqual({
      state: "failed",
    });
  });
});
