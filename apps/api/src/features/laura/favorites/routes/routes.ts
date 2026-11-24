import { problemResponses } from "@allonfire/core/features/errors/constants/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { LAURA } from "../../constants/laura";
import {
  favoriteBodySchema,
  galleryPageBodySchema,
} from "../../constants/schemas";

export const favoritesRoute = describeRoute({
  description: LAURA.FAVORITES.DOC.GET_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(galleryPageBodySchema) },
      },
      description: LAURA.FAVORITES.DOC.GET_200,
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: LAURA.FAVORITES.DOC.GET_SUMMARY,
  tags: [LAURA.FAVORITES.OPENAPI_TAG],
});

const favoriteBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(favoriteBodySchema) },
};

export const markRoute = describeRoute({
  description: LAURA.FAVORITES.DOC.PUT_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: favoriteBody,
      description: LAURA.FAVORITES.DOC.PUT_200,
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND
    ),
  },
  summary: LAURA.FAVORITES.DOC.PUT_SUMMARY,
  tags: [LAURA.FAVORITES.OPENAPI_TAG],
});

export const unmarkRoute = describeRoute({
  description: LAURA.FAVORITES.DOC.DELETE_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: favoriteBody,
      description: LAURA.FAVORITES.DOC.DELETE_200,
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: LAURA.FAVORITES.DOC.DELETE_SUMMARY,
  tags: [LAURA.FAVORITES.OPENAPI_TAG],
});
