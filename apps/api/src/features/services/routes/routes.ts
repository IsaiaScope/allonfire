import { problemResponses } from "@allonfire/core/features/errors/constants/openapi";
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
  description: SERVICES.DOC.LIST_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(serviceListBodySchema),
      description: SERVICES.DOC.LIST_200,
    },
    ...refused,
  },
  summary: SERVICES.DOC.LIST_SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const serviceRoute = describeRoute({
  description: SERVICES.DOC.SERVICE_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(serviceBodySchema),
      description: SERVICES.DOC.SERVICE_200,
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: SERVICES.DOC.SERVICE_SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const providerRoute = describeRoute({
  description: SERVICES.DOC.PROVIDER_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(providerSavedBodySchema),
      description: SERVICES.DOC.PROVIDER_200,
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.CONFLICT
    ),
  },
  summary: SERVICES.DOC.PROVIDER_SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const testRoute = describeRoute({
  description: SERVICES.DOC.TEST_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(testSendBodySchema),
      description: SERVICES.DOC.TEST_200,
    },
    ...problemResponses(
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.TOO_MANY_REQUESTS
    ),
  },
  summary: SERVICES.DOC.TEST_SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});

export const keepAliveRoute = describeRoute({
  description: SERVICES.DOC.KEEP_ALIVE_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: json(keepAliveBodySchema),
      description: SERVICES.DOC.KEEP_ALIVE_200,
    },
    ...problemResponses(HTTP.STATUS.UNAUTHORIZED),
  },
  summary: SERVICES.DOC.KEEP_ALIVE_SUMMARY,
  tags: [SERVICES.OPENAPI_TAG],
});
