import { problemResponses } from "@allonfire/core/features/errors/constants/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { overviewBodySchema } from "../constants/schemas";
import { STORAGE_USAGE } from "../constants/storage-usage";

export const overviewRoute = describeRoute({
  description: STORAGE_USAGE.DOC.OVERVIEW_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(overviewBodySchema) },
      },
      description: STORAGE_USAGE.DOC.OVERVIEW_200,
    },
    ...problemResponses(HTTP.STATUS.UNAUTHORIZED, HTTP.STATUS.FORBIDDEN),
  },
  summary: STORAGE_USAGE.DOC.OVERVIEW_SUMMARY,
  tags: [STORAGE_USAGE.OPENAPI_TAG],
});
