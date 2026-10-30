import { HTTP } from "@allonfire/core/features/http/constants/http";
import { describeRoute, resolver } from "hono-openapi";
import { OPENAPI } from "../../docs/constants/openapi";
import {
  HEALTH,
  healthBodySchema,
  readyServingBodySchema,
  readyUnavailableBodySchema,
} from "../constants/statuses";

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
  description: HEALTH.PROBE_DESCRIPTION.HEALTH_DESCRIPTION,
  responses: {
    [HEALTH.READY_STATUS_CODE.READY]: {
      content: healthBody,
      description: HEALTH.PROBE_DESCRIPTION.HEALTH_200,
    },
  },
  summary: HEALTH.PROBE_DESCRIPTION.HEALTH_SUMMARY,
  tags: [OPENAPI.TAG.INFRASTRUCTURE],
});

export const readyRoute = describeRoute({
  description: HEALTH.PROBE_DESCRIPTION.READY_DESCRIPTION,
  responses: {
    [HEALTH.READY_STATUS_CODE.READY]: {
      content: readyServingBody,
      description: HEALTH.PROBE_DESCRIPTION.READY_200,
    },
    [HEALTH.READY_STATUS_CODE.NOT_READY]: {
      content: readyUnavailableBody,
      description: HEALTH.PROBE_DESCRIPTION.READY_503,
    },
  },
  summary: HEALTH.PROBE_DESCRIPTION.READY_SUMMARY,
  tags: [OPENAPI.TAG.INFRASTRUCTURE],
});
