import { problemResponseRef } from "@allonfire/core/features/errors/constants/openapi";
import {
  CONTENT_TYPE,
  HTTP_STATUS,
} from "@allonfire/core/features/http/constants/http";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { imageBodySchema } from "../../constants/schemas";
import { IMAGE_OPENAPI_TAG, IMAGE_ROUTE_DOC } from "../constants/openapi";
import { imageListBodySchema } from "../constants/schemas";

// The same schemas the handlers return through, so the documented body cannot
// drift from the served one.
const imageBody = {
  [CONTENT_TYPE.JSON]: { schema: resolver(imageBodySchema) },
};
const imageListBody = {
  [CONTENT_TYPE.JSON]: { schema: resolver(imageListBodySchema) },
};
const imagesBody = {
  [CONTENT_TYPE.JSON]: { schema: resolver(z.array(imageBodySchema)) },
};

/**
 * Every error is the host's problem document (ADR 0015), one per status, so
 * the docs list only the codes that status carries.
 */
const problems = <S extends number>(...statuses: S[]) =>
  objectFromEntries(
    statuses.map(
      (status) => [status, { $ref: problemResponseRef(status) }] as const
    )
  );

export const listRoute = describeRoute({
  description: IMAGE_ROUTE_DOC.LIST_DESCRIPTION,
  responses: {
    [HTTP_STATUS.OK]: {
      content: imageListBody,
      description: IMAGE_ROUTE_DOC.LIST_200,
    },
    ...problems(
      HTTP_STATUS.BAD_REQUEST,
      HTTP_STATUS.UNAUTHORIZED,
      HTTP_STATUS.FORBIDDEN
    ),
  },
  summary: IMAGE_ROUTE_DOC.LIST_SUMMARY,
  tags: [IMAGE_OPENAPI_TAG],
});

export const getRoute = describeRoute({
  description: IMAGE_ROUTE_DOC.GET_DESCRIPTION,
  responses: {
    [HTTP_STATUS.OK]: {
      content: imageBody,
      description: IMAGE_ROUTE_DOC.GET_200,
    },
    ...problems(HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.NOT_FOUND),
  },
  summary: IMAGE_ROUTE_DOC.GET_SUMMARY,
  tags: [IMAGE_OPENAPI_TAG],
});

export const uploadRoute = describeRoute({
  description: IMAGE_ROUTE_DOC.UPLOAD_DESCRIPTION,
  responses: {
    [HTTP_STATUS.CREATED]: {
      content: imagesBody,
      description: IMAGE_ROUTE_DOC.UPLOAD_201,
    },
    ...problems(
      HTTP_STATUS.BAD_REQUEST,
      HTTP_STATUS.UNAUTHORIZED,
      HTTP_STATUS.FORBIDDEN,
      HTTP_STATUS.PAYLOAD_TOO_LARGE,
      HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
      HTTP_STATUS.SERVICE_UNAVAILABLE
    ),
  },
  summary: IMAGE_ROUTE_DOC.UPLOAD_SUMMARY,
  tags: [IMAGE_OPENAPI_TAG],
});

export const patchRoute = describeRoute({
  description: IMAGE_ROUTE_DOC.PATCH_DESCRIPTION,
  responses: {
    [HTTP_STATUS.OK]: {
      content: imagesBody,
      description: IMAGE_ROUTE_DOC.PATCH_200,
    },
    ...problems(
      HTTP_STATUS.BAD_REQUEST,
      HTTP_STATUS.UNAUTHORIZED,
      HTTP_STATUS.FORBIDDEN,
      HTTP_STATUS.NOT_FOUND
    ),
  },
  summary: IMAGE_ROUTE_DOC.PATCH_SUMMARY,
  tags: [IMAGE_OPENAPI_TAG],
});

export const deleteRoute = describeRoute({
  description: IMAGE_ROUTE_DOC.DELETE_DESCRIPTION,
  responses: {
    [HTTP_STATUS.NO_CONTENT]: { description: IMAGE_ROUTE_DOC.DELETE_204 },
    ...problems(
      HTTP_STATUS.BAD_REQUEST,
      HTTP_STATUS.UNAUTHORIZED,
      HTTP_STATUS.FORBIDDEN,
      HTTP_STATUS.NOT_FOUND
    ),
  },
  summary: IMAGE_ROUTE_DOC.DELETE_SUMMARY,
  tags: [IMAGE_OPENAPI_TAG],
});
