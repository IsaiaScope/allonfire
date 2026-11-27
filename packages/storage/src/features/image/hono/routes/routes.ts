import { problemResponses } from "@allonfire/core/features/errors/utils/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { IMAGE } from "../../constants/image";
import { imageBodySchema } from "../../constants/schemas";
import {
  deleteResultBodySchema,
  imagePageBodySchema,
} from "../constants/schemas";

// The same schemas the handlers return through, so the documented body cannot
// drift from the served one.
const imageBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(imageBodySchema) },
};
const imagePageBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(imagePageBodySchema) },
};
const deleteResultBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(deleteResultBodySchema) },
};
const imagesBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(z.array(imageBodySchema)) },
};

export const listRoute = describeRoute({
  description: IMAGE.DOC.LIST.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: imagePageBody,
      description: IMAGE.DOC.LIST.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(HTTP.STATUS.BAD_REQUEST),
  },
  summary: IMAGE.DOC.LIST.SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const getRoute = describeRoute({
  description: IMAGE.DOC.GET.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: imageBody,
      description: IMAGE.DOC.GET.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(HTTP.STATUS.NOT_FOUND),
  },
  summary: IMAGE.DOC.GET.SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

/** The Export's body is the JPEG itself, not JSON. */
const exportBody = {
  [IMAGE.EXPORT.CONTENT_TYPE]: {
    schema: { format: "binary", type: "string" },
  },
} as const;

export const exportRoute = describeRoute({
  description: IMAGE.EXPORT.DOC.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: exportBody,
      description: IMAGE.EXPORT.DOC.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.TOO_MANY_REQUESTS
    ),
  },
  summary: IMAGE.EXPORT.DOC.SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const uploadRoute = describeRoute({
  description: IMAGE.DOC.UPLOAD.DESCRIPTION,
  responses: {
    [HTTP.STATUS.CREATED]: {
      content: imagesBody,
      description: IMAGE.DOC.UPLOAD.RESPONSE[HTTP.STATUS.CREATED],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.PAYLOAD_TOO_LARGE,
      HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
      HTTP.STATUS.SERVICE_UNAVAILABLE
    ),
  },
  summary: IMAGE.DOC.UPLOAD.SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const patchRoute = describeRoute({
  description: IMAGE.DOC.PATCH.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: imagesBody,
      description: IMAGE.DOC.PATCH.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN,
      HTTP.STATUS.NOT_FOUND,
      HTTP.STATUS.CONFLICT
    ),
  },
  summary: IMAGE.DOC.PATCH.SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});

export const deleteRoute = describeRoute({
  description: IMAGE.DOC.DELETE.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: deleteResultBody,
      description: IMAGE.DOC.DELETE.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: IMAGE.DOC.DELETE.SUMMARY,
  tags: [IMAGE.OPENAPI_TAG],
});
