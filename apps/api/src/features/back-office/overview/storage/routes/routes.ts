import { problemResponses } from "@allonfire/core/features/errors/utils/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { BACK_OFFICE } from "../../../constants/back-office";
import { overviewBodySchema } from "../constants/schemas";

export const overviewRoute = describeRoute({
  description: BACK_OFFICE.OVERVIEW.STORAGE.DOC.OVERVIEW.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(overviewBodySchema) },
      },
      description:
        BACK_OFFICE.OVERVIEW.STORAGE.DOC.OVERVIEW.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(HTTP.STATUS.UNAUTHORIZED, HTTP.STATUS.FORBIDDEN),
  },
  summary: BACK_OFFICE.OVERVIEW.STORAGE.DOC.OVERVIEW.SUMMARY,
  tags: [BACK_OFFICE.OVERVIEW.OPENAPI_TAG],
});
