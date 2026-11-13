// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { itGuardsAdminOverview } from "../../../shared/tests/admin-overview-gate";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { STORAGE_USAGE } from "../constants/storage-usage";
import type { StorageUsageDeps } from "../utils/deps";
import { stubStorageUsageDeps } from "./stub-storage-usage-deps";

const OVERVIEW = `${API.PATH.STORAGE_USAGE}${STORAGE_USAGE.PATH.OVERVIEW}`;
const LISTED_AT = "2026-11-09T10:00:00.000Z";
const STATS = {
  byApp: [
    {
      app: App.LAURA,
      privateBytes: 300,
      privateCount: 1,
      publicBytes: 50,
      publicCount: 1,
    },
  ],
  total: 2,
  totalBytes: 350,
};

const AVATARS = [{ app: App.LAURA, bytes: 70, count: 2 }];

const appWith = (overrides: Partial<StorageUsageDeps>, signedIn = true) =>
  createApp(
    appDeps({
      auth: apiAuth({
        getSession: () => Promise.resolve(signedIn ? sessionFor() : null),
      }),
      storageUsage: stubStorageUsageDeps(overrides),
    })
  );

const admin = (overrides: Partial<StorageUsageDeps> = {}) =>
  appWith({
    avatars: () => Promise.resolve(AVATARS),
    canManage: () => Promise.resolve(true),
    imageStats: () => Promise.resolve(STATS),
    ...overrides,
  });

describe("GET /storage/overview", () => {
  itGuardsAdminOverview(OVERVIEW, appWith);

  it("answers each bucket and the Image stats to an Admin", async () => {
    const res = await admin({
      buckets: () =>
        Promise.resolve([
          {
            id: "image",
            kind: STORAGE_USAGE.BUCKET_KIND.IMAGE,
            reading: { asOf: LISTED_AT, bytes: 900, objects: 4 },
          },
        ]),
    }).request(OVERVIEW);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({
      avatars: { byApp: AVATARS },
      buckets: [
        {
          id: "image",
          kind: STORAGE_USAGE.BUCKET_KIND.IMAGE,
          reading: { asOf: LISTED_AT, bytes: 900, objects: 4 },
        },
      ],
      images: STATS,
    });
  });

  it("lists every bucket, one that cannot be listed with a null reading", async () => {
    const res = await admin({
      buckets: () =>
        Promise.resolve([
          { id: "image", kind: STORAGE_USAGE.BUCKET_KIND.IMAGE, reading: null },
          {
            id: "backups",
            kind: STORAGE_USAGE.BUCKET_KIND.IMAGE,
            reading: { asOf: LISTED_AT, bytes: 1, objects: 1 },
          },
        ]),
    }).request(OVERVIEW);
    expect(res.status).toBe(HTTP.STATUS.OK);
    const body = await res.json();
    expect(body).toMatchObject({
      buckets: [
        { id: "image", reading: null },
        { id: "backups", reading: { bytes: 1 } },
      ],
      images: STATS,
    });
  });

  it("names each bucket's kind apart from its configured name", async () => {
    const res = await admin({
      buckets: () =>
        Promise.resolve([
          {
            id: "photos-prod",
            kind: STORAGE_USAGE.BUCKET_KIND.IMAGE,
            reading: null,
          },
        ]),
    }).request(OVERVIEW);
    expect(await res.json()).toMatchObject({
      buckets: [
        {
          id: "photos-prod",
          kind: STORAGE_USAGE.BUCKET_KIND.IMAGE,
          reading: null,
        },
      ],
    });
  });
});
