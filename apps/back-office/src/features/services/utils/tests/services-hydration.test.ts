// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { ServiceType } from "@allonfire/database/enums";
import { cacheLife, cacheTag } from "next/cache";
import {
  dehydratedData,
  sentCookie,
  stubFetchJson,
} from "@/shared/tests/fetch-stub";
import { SESSION_COOKIE } from "@/shared/tests/session-cookie-mock";
import { SERVICES, serviceTag } from "../../constants/services";
import { servicesHydration } from "../services-hydration";
import { servicesListKey } from "../services-queries";

vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@/shared/tests/session-cookie-mock")
);

describe("servicesHydration", () => {
  it("reads the Services as the Session's cookie and dehydrates them under the list's key, tagged and kept as the Services cache says", async () => {
    const fetch = stubFetchJson({ services: [] });
    const state = await servicesHydration(ServiceType.MAIL);
    expect(dehydratedData(state)).toEqual([
      { data: { services: [] }, queryKey: servicesListKey(ServiceType.MAIL) },
    ]);
    // Under every Services copy's tag and its own type's, with its type's life.
    expect(cacheTag).toHaveBeenCalledWith(
      SERVICES.CACHE.TAG,
      serviceTag(ServiceType.MAIL)
    );
    expect(cacheLife).toHaveBeenCalledWith(
      SERVICES.CACHE.LIFE[ServiceType.MAIL]
    );
    // Only that type: another type's providers are never asked for.
    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      `type=${ServiceType.MAIL}`
    );
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("throws a refusal, so nothing is kept", async () => {
    stubFetchJson({}, HTTP.STATUS.FORBIDDEN);
    await expect(servicesHydration(ServiceType.MAIL)).rejects.toThrow();
  });

  it("keeps every type's copy at least 5 minutes, or it drops out of the shell and instant navigation blocks on it", () => {
    // Under 5 minutes Next sees uncached data outside any boundary.
    expect(SERVICES.CACHE.LIFE[ServiceType.MAIL].stale).toBeGreaterThanOrEqual(
      5 * UNIT.SECONDS_PER_MINUTE
    );
  });

  it("tags each type apart, so one type's change leaves the others' copies", () => {
    expect(serviceTag(ServiceType.MAIL)).not.toBe(SERVICES.CACHE.TAG);
    expect(serviceTag(ServiceType.MAIL)).toContain(ServiceType.MAIL);
  });
});
