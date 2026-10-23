import { problemResponses } from "@allonfire/core/features/errors/constants/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { USER } from "../../constants/users";
import {
  userCreatedBodySchema,
  userDeleteBodySchema,
  userListBodySchema,
} from "../constants/schemas";

// The same schemas the handlers return through, so the documented body cannot
// drift from the served one. Errors are the Host's problem documents.
const refused = problemResponses(
  HTTP.STATUS.UNAUTHORIZED,
  HTTP.STATUS.FORBIDDEN
);

export const listRoute = describeRoute({
  description: USER.DOC.LIST_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userListBodySchema) },
      },
      description: USER.DOC.LIST_200,
    },
    ...refused,
  },
  summary: USER.DOC.LIST_SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

export const deleteRoute = describeRoute({
  description: USER.DOC.DELETE_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userDeleteBodySchema) },
      },
      description: USER.DOC.DELETE_200,
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: USER.DOC.DELETE_SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

export const createRoute = describeRoute({
  description: USER.DOC.CREATE_DESCRIPTION,
  responses: {
    [HTTP.STATUS.CREATED]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userCreatedBodySchema) },
      },
      description: USER.DOC.CREATE_201,
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.CONFLICT
    ),
  },
  summary: USER.DOC.CREATE_SUMMARY,
  tags: [USER.OPENAPI_TAG],
});
