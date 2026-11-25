import { problemResponses } from "@allonfire/core/features/errors/utils/openapi";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { LAURA } from "../../constants/laura";
import { galleryPageBodySchema } from "../../constants/schemas";

export const galleryRoute = describeRoute({
  description: LAURA.GALLERY.DOC.GET.DESCRIPTION,
  responses: {
    [HTTP.STATUS.OK]: {
      content: {
        [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(galleryPageBodySchema) },
      },
      description: LAURA.GALLERY.DOC.GET.RESPONSE[HTTP.STATUS.OK],
    },
    ...problemResponses(
      HTTP.STATUS.BAD_REQUEST,
      HTTP.STATUS.UNAUTHORIZED,
      HTTP.STATUS.FORBIDDEN
    ),
  },
  summary: LAURA.GALLERY.DOC.GET.SUMMARY,
  tags: [LAURA.GALLERY.OPENAPI_TAG],
});
