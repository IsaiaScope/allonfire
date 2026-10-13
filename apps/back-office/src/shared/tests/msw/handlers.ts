import { API_PATH, TEST_API_URL } from "@allonfire/config/local/addresses";
import type { InferResponseType } from "hono/client";
import { HttpResponse, http } from "msw";
import type { api } from "@/features/api/utils/api";

/** A healthy API's `/health` body. */
export const HEALTH_OK = {
  status: "ok",
  uptime: 0,
  version: "0.0.0",
} satisfies InferResponseType<typeof api.health.$get, 200>;

/** The API's answers when a test does not set its own. */
export const handlers = [
  http.get(`${TEST_API_URL}${API_PATH.HEALTH}`, () =>
    HttpResponse.json(HEALTH_OK)
  ),
];
