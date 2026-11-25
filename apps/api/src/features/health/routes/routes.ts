import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { OPENAPI } from "../../docs/constants/openapi";
import { HEALTH } from "../constants/statuses";
import {
  healthBodySchema,
  readyServingBodySchema,
  readyUnavailableBodySchema,
} from "../utils/health-schema";

// The same schemas the handlers `satisfies`, so the documented body cannot
// drift from the served one.
const healthBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(healthBodySchema) },
};
const readyServingBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(readyServingBodySchema) },
};
const readyUnavailableBody = {
  [HTTP.CONTENT_TYPE.JSON]: { schema: resolver(readyUnavailableBodySchema) },
};

export const healthRoute = describeRoute({
  description: HEALTH.PROBE_DESCRIPTION.HEALTH.DESCRIPTION,
  responses: {
    [HEALTH.READY.HTTP_STATUS.READY]: {
      content: healthBody,
      description: HEALTH.PROBE_DESCRIPTION.HEALTH.RESPONSE[HTTP.STATUS.OK],
    },
  },
  summary: HEALTH.PROBE_DESCRIPTION.HEALTH.SUMMARY,
  tags: [OPENAPI.TAG.INFRASTRUCTURE],
});

export const readyRoute = describeRoute({
  description: HEALTH.PROBE_DESCRIPTION.READY.DESCRIPTION,
  responses: {
    [HEALTH.READY.HTTP_STATUS.READY]: {
      content: readyServingBody,
      description: HEALTH.PROBE_DESCRIPTION.READY.RESPONSE[HTTP.STATUS.OK],
    },
    [HEALTH.READY.HTTP_STATUS.NOT_READY]: {
      content: readyUnavailableBody,
      description:
        HEALTH.PROBE_DESCRIPTION.READY.RESPONSE[
          HTTP.STATUS.SERVICE_UNAVAILABLE
        ],
    },
  },
  summary: HEALTH.PROBE_DESCRIPTION.READY.SUMMARY,
  tags: [OPENAPI.TAG.INFRASTRUCTURE],
});
