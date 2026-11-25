import { problemResponses } from "@allonfire/core/features/errors/utils/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import {
  keepAliveBodySchema,
  providerSavedBodySchema,
  serviceBodySchema,
  serviceListBodySchema,
  testSendBodySchema,
} from "../constants/schemas";
import { SERVICES } from "../constants/services";

const json = (schema: Parameters<typeof resolver>[0]) => ({
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(schema) },
});
const refused = problemResponses(
  HTTP.STATUS.UNAUTHORIZED,
  HTTP.STATUS.FORBIDDEN
);

export const listRoute = describeRoute({
  description: SERVICES.DOC.LIST.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(serviceListBodySchema),
      description: SERVICES.DOC.LIST.RESPONSE[HTTP.STATUS.OK],
    },
    ...refused,
  },
  summary: SERVICES.DOC.LIST.SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const serviceRoute = describeRoute({
  description: SERVICES.DOC.SERVICE.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(serviceBodySchema),
      description: SERVICES.DOC.SERVICE.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: SERVICES.DOC.SERVICE.SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const providerRoute = describeRoute({
  description: SERVICES.DOC.PROVIDER.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(providerSavedBodySchema),
      description: SERVICES.DOC.PROVIDER.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.CONFLICT
    ),
  },
  summary: SERVICES.DOC.PROVIDER.SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const testRoute = describeRoute({
  description: SERVICES.DOC.TEST.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(testSendBodySchema),
      description: SERVICES.DOC.TEST.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.TOO_MANY_REQUESTS
    ),
  },
  summary: SERVICES.DOC.TEST.SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const keepAliveRoute = describeRoute({
  description: SERVICES.DOC.KEEP_ALIVE.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(keepAliveBodySchema),
      description: SERVICES.DOC.KEEP_ALIVE.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(HTTP.STATUS.UNAUTHORIZED),
  },
  summary: SERVICES.DOC.KEEP_ALIVE.SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});
