import { problemResponses } from "@allonfire/core/features/errors/constants/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { overviewBodySchema } from "../constants/schemas";
import { USER_USAGE } from "../constants/user-usage";

export const overviewRoute = describeRoute({
  description: USER_USAGE.DOC.OVERVIEW_DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(overviewBodySchema) },
      },
      description: USER_USAGE.DOC.OVERVIEW_200,
    },
    ...problemResponses(HTTP.STATUS.UNAUTHORIZED, HTTP.STATUS.FORBIDDEN),
  },
  summary: USER_USAGE.DOC.OVERVIEW_SUMMARY,
  tags: [USER_USAGE.OPENAPI_TAG],
});
