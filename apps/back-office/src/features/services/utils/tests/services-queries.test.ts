// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { ServiceType } from "@allonfire/database/enums";
import { hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { servicesListKey, servicesQuery } from "../services-queries";

const api = hc<ApiType>(LOCAL.URL.TEST_API);

describe("servicesQuery", () => {
  it("is keyed by its type under the Services prefix, so one refresh reaches every type", () => {
    expect(servicesListKey(ServiceType.MAIL)).toEqual(
      QUERY.SERVICES.LIST(ServiceType.MAIL)
    );
    expect(servicesListKey(ServiceType.MAIL).slice(0, 1)).toEqual(
      QUERY.SERVICES.ALL
    );
  });

  it("is never stale by the clock: reading the time while the page prerenders blocks a navigation to it", () => {
    const options = servicesQuery(api, ServiceType.MAIL);
    expect(options.staleTime).toBe("static");
    expect(options.refetchInterval).toBeUndefined();
  });

  it("asks the API for that type alone", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL) =>
      Response.json({ services: [] })
    );
    vi.stubGlobal("fetch", fetch);
    const { queryFn } = servicesQuery(api, ServiceType.MAIL);
    expect(await queryFn?.({} as never)).toEqual({ services: [] });
    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      `type=${ServiceType.MAIL}`
    );
  });
});
