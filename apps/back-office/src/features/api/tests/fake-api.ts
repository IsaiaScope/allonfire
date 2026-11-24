import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { fakeServerApi } from "@allonfire/core/features/next/api/tests/fake-api";
import { hc } from "hono/client";

/**
 * `serverApi`'s stand-in: the typed client over the fake.
 * `vi.mock("@/features/api/utils/server-api", () => import("@/features/api/tests/fake-api"))`.
 */
export const serverApi = () => fakeServerApi(hc<ApiType>, LOCAL.URL.TEST_API);
