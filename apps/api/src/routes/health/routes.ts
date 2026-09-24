import { describeRoute, resolver } from "hono-openapi";
import { CONTENT_TYPE } from "../../shared/constants/http";
import { OPENAPI_TAG } from "../docs/constants/openapi";
import {
  healthBodySchema,
  PROBE_DESCRIPTION,
  READY_STATUS_CODE,
  readyServingBodySchema,
  readyUnavailableBodySchema,
} from "./constants/statuses";

// The same schemas the handlers `satisfies`, so the documented body cannot
// drift from the served one.
const healthBody = {
  [CONTENT_TYPE.JSON]: { schema: resolver(healthBodySchema) },
};
const readyServingBody = {
  [CONTENT_TYPE.JSON]: { schema: resolver(readyServingBodySchema) },
};
const readyUnavailableBody = {
  [CONTENT_TYPE.JSON]: { schema: resolver(readyUnavailableBodySchema) },
};

export const healthRoute = describeRoute({
  description: PROBE_DESCRIPTION.HEALTH_DESCRIPTION,
  responses: {
    [READY_STATUS_CODE.READY]: {
      content: healthBody,
      description: PROBE_DESCRIPTION.HEALTH_200,
    },
  },
  summary: PROBE_DESCRIPTION.HEALTH_SUMMARY,
  tags: [OPENAPI_TAG.INFRASTRUCTURE],
});

export const readyRoute = describeRoute({
  description: PROBE_DESCRIPTION.READY_DESCRIPTION,
  responses: {
    [READY_STATUS_CODE.READY]: {
      content: readyServingBody,
      description: PROBE_DESCRIPTION.READY_200,
    },
    [READY_STATUS_CODE.NOT_READY]: {
      content: readyUnavailableBody,
      description: PROBE_DESCRIPTION.READY_503,
    },
  },
  summary: PROBE_DESCRIPTION.READY_SUMMARY,
  tags: [OPENAPI_TAG.INFRASTRUCTURE],
});
