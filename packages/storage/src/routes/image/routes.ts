import { CONTENT_TYPE, HTTP_STATUS } from "@allonfire/utils/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { IMAGE_OPENAPI_TAG, PROBLEM_RESPONSE_REF } from "./constants/openapi";
import { imageBodySchema, imageListBodySchema } from "./constants/schemas";

const problem = { $ref: PROBLEM_RESPONSE_REF };
const json = (schema: Parameters<typeof resolver>[0]) => ({
  [CONTENT_TYPE.JSON]: { schema: resolver(schema) },
});

export const listRoute = describeRoute({
  responses: {
    [HTTP_STATUS.OK]: {
      content: json(imageListBodySchema),
      description: "One page of Images",
    },
    [HTTP_STATUS.BAD_REQUEST]: problem,
    [HTTP_STATUS.UNAUTHORIZED]: problem,
    [HTTP_STATUS.FORBIDDEN]: problem,
  },
  summary: "List an App's Images and the ones shown by every App",
  tags: [IMAGE_OPENAPI_TAG],
});

export const getRoute = describeRoute({
  responses: {
    [HTTP_STATUS.OK]: {
      content: json(imageBodySchema),
      description: "The Image",
    },
    [HTTP_STATUS.UNAUTHORIZED]: problem,
    [HTTP_STATUS.NOT_FOUND]: problem,
  },
  summary: "One Image",
  tags: [IMAGE_OPENAPI_TAG],
});

const images = {
  content: json(z.array(imageBodySchema)),
  description: "The Images",
};

export const uploadRoute = describeRoute({
  description:
    "multipart/form-data: repeated `file` parts and one `meta` JSON part, `[{ app, alt }]` in file order. All or nothing.",
  responses: {
    [HTTP_STATUS.CREATED]: images,
    [HTTP_STATUS.BAD_REQUEST]: problem,
    [HTTP_STATUS.UNAUTHORIZED]: problem,
    [HTTP_STATUS.FORBIDDEN]: problem,
    [HTTP_STATUS.PAYLOAD_TOO_LARGE]: problem,
    [HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE]: problem,
  },
  summary: "Upload Images",
  tags: [IMAGE_OPENAPI_TAG],
});

export const patchRoute = describeRoute({
  responses: {
    [HTTP_STATUS.OK]: images,
    [HTTP_STATUS.BAD_REQUEST]: problem,
    [HTTP_STATUS.UNAUTHORIZED]: problem,
    [HTTP_STATUS.FORBIDDEN]: problem,
    [HTTP_STATUS.NOT_FOUND]: problem,
  },
  summary: "Move Images between Apps or change their alt. All or nothing",
  tags: [IMAGE_OPENAPI_TAG],
});

export const deleteRoute = describeRoute({
  responses: {
    [HTTP_STATUS.NO_CONTENT]: { description: "Deleted" },
    [HTTP_STATUS.BAD_REQUEST]: problem,
    [HTTP_STATUS.UNAUTHORIZED]: problem,
    [HTTP_STATUS.FORBIDDEN]: problem,
    [HTTP_STATUS.NOT_FOUND]: problem,
  },
  summary: "Delete Images. All or nothing",
  tags: [IMAGE_OPENAPI_TAG],
});
