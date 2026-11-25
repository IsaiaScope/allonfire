import { problemResponses } from "@allonfire/core/features/errors/utils/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { LAURA } from "../../constants/laura";
import {
  deckBodySchema,
  leaderboardBodySchema,
  scoreBodySchema,
} from "../constants/schemas";

const json = (schema: Parameters<typeof resolver>[0]) => ({
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(schema) },
});

export const deckRoute = describeRoute({
  description: LAURA.GAMES.DOC.DECK.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(deckBodySchema),
      description: LAURA.GAMES.DOC.DECK.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(HTTP.STATUS.UNAUTHORIZED, HTTP.STATUS.FORBIDDEN),
  },
  summary: LAURA.GAMES.DOC.DECK.SUMMARY,
  tags: [LAURA.GAMES.OPENAPI_TAG],
});

export const scoreRoute = describeRoute({
  description: LAURA.GAMES.DOC.SCORES.DESCRIPTION,
  responses: {
    [HTTP.STATUS.CREATED]: {
      content: json(scoreBodySchema),
      description: LAURA.GAMES.DOC.SCORES.RESPONSE[HTTP.STATUS.CREATED],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.TOO_MANY_REQUESTS
    ),
  },
  summary: LAURA.GAMES.DOC.SCORES.SUMMARY,
  tags: [LAURA.GAMES.OPENAPI_TAG],
});

export const leaderboardRoute = describeRoute({
  description: LAURA.GAMES.DOC.LEADERBOARD.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(leaderboardBodySchema),
      description: LAURA.GAMES.DOC.LEADERBOARD.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(HTTP.STATUS.UNAUTHORIZED, HTTP.STATUS.FORBIDDEN),
  },
  summary: LAURA.GAMES.DOC.LEADERBOARD.SUMMARY,
  tags: [LAURA.GAMES.OPENAPI_TAG],
});
