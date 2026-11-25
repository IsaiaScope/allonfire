import { problemResponses } from "@allonfire/core/features/errors/utils/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { USER } from "../../constants/users";
import {
  userAvatarBodySchema,
  userBodySchema,
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
  description: USER.DOC.LIST.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userListBodySchema) },
      },
      description: USER.DOC.LIST.RESPONSE[HTTP.STATUS.OK],
    },
    ...refused,
  },
  summary: USER.DOC.LIST.SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

export const deleteRoute = describeRoute({
  description: USER.DOC.DELETE.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userDeleteBodySchema) },
      },
      description: USER.DOC.DELETE.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: USER.DOC.DELETE.SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

export const createRoute = describeRoute({
  description: USER.DOC.CREATE.DESCRIPTION,
  responses: {
    [HTTP.STATUS.CREATED]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userCreatedBodySchema) },
      },
      description: USER.DOC.CREATE.RESPONSE[HTTP.STATUS.CREATED],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.CONFLICT
    ),
  },
  summary: USER.DOC.CREATE.SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

export const avatarPutRoute = describeRoute({
  description: USER.DOC.AVATAR_PUT.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userAvatarBodySchema) },
      },
      description: USER.DOC.AVATAR_PUT.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.CONFLICT,
      HTTP.STATUS.PAYLOAD_TOO_LARGE,
      HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE
    ),
  },
  summary: USER.DOC.AVATAR_PUT.SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

export const avatarDeleteRoute = describeRoute({
  description: USER.DOC.AVATAR_DELETE.DESCRIPTION,
  responses: {
    [HTTP.STATUS.NO_CONTENT]: {
      description: USER.DOC.AVATAR_DELETE.RESPONSE[HTTP.STATUS.NO_CONTENT],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.CONFLICT
    ),
  },
  summary: USER.DOC.AVATAR_DELETE.SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

const userBody = {
  content: { [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(userBodySchema) } },
};

export const readRoute = describeRoute({
  description: USER.DOC.READ.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      ...userBody,
      description: USER.DOC.READ.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND
    ),
  },
  summary: USER.DOC.READ.SUMMARY,
  tags: [USER.OPENAPI_TAG],
});

export const updateRoute = describeRoute({
  description: USER.DOC.UPDATE.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      ...userBody,
      description: USER.DOC.UPDATE.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.CONFLICT
    ),
  },
  summary: USER.DOC.UPDATE.SUMMARY,
  tags: [USER.OPENAPI_TAG],
});
