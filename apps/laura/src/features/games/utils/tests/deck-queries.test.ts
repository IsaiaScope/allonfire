// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { answeringApi } from "@allonfire/core/features/next/api/tests/answering-api";
import { hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { ONLY_SERVER_FAILURES, retryAnswers } from "@/shared/tests/retry-rule";
import { GAMES } from "../../constants/games";
import { deckBody } from "../../tests/deck-body";
import { deckQuery, fetchDeck } from "../deck-queries";

const answering = (body: unknown) =>
  answeringApi(hc<ApiType>, LOCAL.URL.TEST_API, body);
const { client: api } = answering({});

describe("deckQuery", () => {
  it("keeps nothing: a key per round, never stale, gone when the board leaves", () => {
    const options = deckQuery(api, 3);
    expect(options.queryKey).toEqual(QUERY.GAMES.DECK(3));
    expect(deckQuery(api, 4).queryKey).not.toEqual(options.queryKey);
    expect(options.staleTime).toBe("static");
    expect(options.gcTime).toBe(0);
  });

  it("tells its failure on the board, never in a toast", () => {
    expect(deckQuery(api, 0).meta).toEqual({ errorToast: false });
  });

  it("does not ask again after the API refused, and asks once more after a server failure", () => {
    expect(
      retryAnswers(deckQuery(api, 0).retry, GAMES.MEMORY.DECK.RETRIES)
    ).toEqual(ONLY_SERVER_FAILURES);
  });
});

describe("fetchDeck", () => {
  it("answers the API's body", async () => {
    const body = deckBody();
    expect(await fetchDeck(answering(body).client)).toEqual(body);
  });
});
