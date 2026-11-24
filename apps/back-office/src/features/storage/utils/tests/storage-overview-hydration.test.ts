// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import {
  dehydratedData,
  sentCookie,
  stubFetchJson,
} from "@allonfire/ui/shared/tests/fetch-stub";
import { SESSION_COOKIE } from "@allonfire/ui/shared/tests/session-cookie-mock";
import { cacheLife, cacheTag } from "next/cache";
import { STORAGE_OVERVIEW } from "@/shared/tests/msw/handlers";
import { STORAGE } from "../../constants/storage";
import { storageOverviewHydration } from "../storage-overview-hydration";
import { storageOverviewKey } from "../storage-overview-queries";

vi.mock(
  "next/cache",
  () => import("@allonfire/ui/shared/tests/next-cache-mock")
);
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@allonfire/ui/shared/tests/session-cookie-mock")
);

describe("storageOverviewHydration", () => {
  it("reads the overview as the Session's cookie and dehydrates it under its key, tagged and kept as the Storage cache says", async () => {
    const fetch = stubFetchJson(STORAGE_OVERVIEW);
    const state = await storageOverviewHydration();
    expect(dehydratedData(state)).toEqual([
      { data: STORAGE_OVERVIEW, queryKey: storageOverviewKey },
    ]);
    expect(cacheTag).toHaveBeenCalledWith(STORAGE.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(STORAGE.CACHE.LIFE);
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("throws a refusal, so nothing is kept", async () => {
    stubFetchJson({}, HTTP.STATUS.FORBIDDEN);
    await expect(storageOverviewHydration()).rejects.toThrow();
  });

  it("keeps the copy at least 5 minutes, or it drops out of the shell and instant navigation blocks on it", () => {
    expect(STORAGE.CACHE.LIFE.stale).toBeGreaterThanOrEqual(
      5 * UNIT.SECONDS_PER_MINUTE
    );
  });
});
