import { describeRoute } from "hono-openapi";
import { OPENAPI_TAG } from "../docs/constants/openapi";
import { PROBE_DESCRIPTION, READY_STATUS_CODE } from "./constants/statuses";

export const healthRoute = describeRoute({
  description: PROBE_DESCRIPTION.HEALTH_DESCRIPTION,
  responses: {
    [READY_STATUS_CODE.READY]: {
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
      description: PROBE_DESCRIPTION.READY_200,
    },
    [READY_STATUS_CODE.NOT_READY]: {
      description: PROBE_DESCRIPTION.READY_503,
    },
  },
  summary: PROBE_DESCRIPTION.READY_SUMMARY,
  tags: [OPENAPI_TAG.INFRASTRUCTURE],
});
