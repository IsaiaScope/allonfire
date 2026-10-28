import { API } from "@allonfire/api/shared/constants/api";
import { TEST_API_URL } from "@allonfire/config/local/addresses";
import type { HTTP } from "@allonfire/core/features/http/constants/http";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import type { InferResponseType } from "hono/client";
import { HttpResponse, http } from "msw";
import type { api } from "@/features/api/utils/api";

/** A healthy API's `/health` body. */
export const HEALTH_OK = {
  status: "ok",
  uptime: 0,
  version: "0.0.0",
} satisfies InferResponseType<typeof api.health.$get, typeof HTTP.STATUS.OK>;

/** Where the browser asks for Users. */
export const USERS_URL = `${TEST_API_URL}${API.PATH.USERS}`;

/** Two Fixtures: Laura's Admin, and the User in no App. */
export const USERS_PAGE = {
  pageCount: 1,
  total: 2,
  users: [
    {
      createdAt: "2026-10-02T10:00:00.000Z",
      email: FIXTURE.USER.LAURA.ADMIN.email,
      id: "user-laura",
      image: null,
      memberships: [...FIXTURE.USER.LAURA.ADMIN.memberships],
      name: FIXTURE.USER.LAURA.ADMIN.name,
    },
    {
      createdAt: "2026-10-01T10:00:00.000Z",
      email: FIXTURE.USER.NO_MEMBERSHIP.email,
      id: "user-none",
      image: null,
      memberships: [...FIXTURE.USER.NO_MEMBERSHIP.memberships],
      name: FIXTURE.USER.NO_MEMBERSHIP.name,
    },
  ],
} satisfies InferResponseType<
  (typeof api)[typeof API.VERSION.CURRENT]["users"]["$get"],
  typeof HTTP.STATUS.OK
>;

/** The API's answers when a test does not set its own. */
export const handlers = [
  http.get(`${TEST_API_URL}${API.PATH.HEALTH}`, () =>
    HttpResponse.json(HEALTH_OK)
  ),
  http.get(USERS_URL, () => HttpResponse.json(USERS_PAGE)),
];
