import { problemResponseRef } from "@allonfire/core/features/errors/constants/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { IMAGE } from "../../constants/image";
import { imageBodySchema } from "../../constants/schemas";
import { imageListBodySchema } from "../constants/schemas";

// The same schemas the handlers return through, so the documented body cannot
// drift from the served one.
const imageBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(imageBodySchema) },
};
const imageListBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(imageListBodySchema) },
};
const imagesBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(z.array(imageBodySchema)) },
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
  description: IMAGE.DOC.LIST_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: imageListBody,
      description: IMAGE.DOC.LIST_200,
    },
    ...problems(HTTP.STATUS.BAD_REQUEST),
  },
  summary: IMAGE.DOC.LIST_SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const getRoute = describeRoute({
  description: IMAGE.DOC.GET_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: imageBody,
      description: IMAGE.DOC.GET_200,
    },
    ...problems(HTTP.STATUS.NOT_FOUND),
  },
  summary: IMAGE.DOC.GET_SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const uploadRoute = describeRoute({
  description: IMAGE.DOC.UPLOAD_DESCRIPTION,
  responses: {
    [HTTP.STATUS.CREATED]: {
      content: imagesBody,
      description: IMAGE.DOC.UPLOAD_201,
    },
    ...problems(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.PAYLOAD_TOO_LARGE,
      HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
      HTTP.STATUS.SERVICE_UNAVAILABLE
    ),
  },
  summary: IMAGE.DOC.UPLOAD_SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const patchRoute = describeRoute({
  description: IMAGE.DOC.PATCH_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: imagesBody,
      description: IMAGE.DOC.PATCH_200,
    },
    ...problems(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND
    ),
  },
  summary: IMAGE.DOC.PATCH_SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const deleteRoute = describeRoute({
  description: IMAGE.DOC.DELETE_DESCRIPTION,
  responses: {
    [HTTP.STATUS.NO_CONTENT]: { description: IMAGE.DOC.DELETE_204 },
    ...problems(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND
    ),
  },
  summary: IMAGE.DOC.DELETE_SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});
