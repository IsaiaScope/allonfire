// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { DetailedError, hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { STORAGE_OVERVIEW } from "@/shared/tests/msw/handlers";
import {
  fetchStorageOverview,
  retryStorageOverview,
  storageOverviewKey,
  storageOverviewQuery,
} from "../storage-overview-queries";

const api = hc<ApiType>(LOCAL.URL.TEST_API);

describe("storageOverviewQuery", () => {
  it("is keyed under the Storage prefix, so one refresh reaches it", () => {
    expect(storageOverviewKey).toEqual(QUERY.STORAGE.OVERVIEW);
    expect(storageOverviewKey.slice(0, 1)).toEqual(QUERY.STORAGE.ALL);
  });

  it("is never stale by the clock: reading the time while the page prerenders blocks a navigation to it", () => {
    const options = storageOverviewQuery(api);
    expect(options.staleTime).toBe("static");
    expect(options.refetchInterval).toBeUndefined();
  });

  it("answers the API's body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(STORAGE_OVERVIEW))
    );
    expect(await fetchStorageOverview(api)).toEqual(STORAGE_OVERVIEW);
  });
});

describe("retryStorageOverview", () => {
  it("asks once more after a server failure, never after a refusal", () => {
    const refused = new DetailedError("403", { statusCode: 403 });
    const broken = new DetailedError("500", { statusCode: 500 });
    expect(retryStorageOverview(0, broken)).toBe(true);
    expect(retryStorageOverview(1, broken)).toBe(false);
    expect(retryStorageOverview(0, refused)).toBe(false);
  });
});
