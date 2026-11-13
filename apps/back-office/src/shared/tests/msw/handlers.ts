import { STORAGE_USAGE } from "@allonfire/api/features/storage-usage/constants/storage-usage";
import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import type { HTTP } from "@allonfire/core/features/http/constants/http";
import { App, ImageAccess } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import type { ImagePageBody } from "@allonfire/storage/features/image/hono/constants/schemas";
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
export const USERS_URL = `${LOCAL.URL.TEST_API}${API.PATH.USERS}`;

/** Two Fixtures: Laura's Admin, and the User in no App. */
export const USERS_PAGE = {
  pageCount: 1,
  total: 2,
  users: [
    {
      createdAt: "2026-10-02T10:00:00.000Z",
      email: FIXTURE.USER.LAURA.ADMIN.email,
      emailVerified: true,
      id: "user-laura",
      image: null,
      imageBlurDataUrl: null,
      memberships: [...FIXTURE.USER.LAURA.ADMIN.memberships],
      name: FIXTURE.USER.LAURA.ADMIN.name,
      version: "version-laura",
    },
    {
      createdAt: "2026-10-01T10:00:00.000Z",
      email: FIXTURE.USER.NO_MEMBERSHIP.email,
      emailVerified: true,
      id: "user-none",
      image: null,
      imageBlurDataUrl: null,
      memberships: [...FIXTURE.USER.NO_MEMBERSHIP.memberships],
      name: FIXTURE.USER.NO_MEMBERSHIP.name,
      version: "version-none",
    },
  ],
} satisfies InferResponseType<
  (typeof api)[typeof API.VERSION.CURRENT]["users"]["$get"],
  typeof HTTP.STATUS.OK
>;

/** Where the browser asks for Images. */
export const IMAGES_URL = `${LOCAL.URL.TEST_API}${API.PATH.IMAGES}`;

/** Two Images: a private one in the Back Office, and a public one in both Apps. */
export const IMAGES_PAGE = {
  images: [
    {
      access: ImageAccess.PRIVATE,
      alt: { en: "The sea", it: "Il mare" },
      apps: [App.BACK_OFFICE],
      blurDataUrl: "data:image/webp;base64,AAAA",
      bytes: 1_500_000,
      createdAt: "2026-10-02T10:00:00.000Z",
      height: 600,
      id: "image-sea",
      key: "0b9a0c3e-0000-4000-8000-000000000001.avif",
      srcSet: [{ url: "https://cdn.test/sea-400.avif", width: 400 }],
      version: "version-sea",
      width: 800,
    },
    {
      access: ImageAccess.PUBLIC,
      alt: { en: "The hills", it: "Le colline" },
      apps: [App.LAURA, App.BACK_OFFICE],
      blurDataUrl: "data:image/webp;base64,AAAA",
      bytes: 1_000_000,
      createdAt: "2026-10-01T10:00:00.000Z",
      height: 900,
      id: "image-hills",
      key: "0b9a0c3e-0000-4000-8000-000000000002.avif",
      srcSet: [{ url: "https://cdn.test/hills-400.avif", width: 400 }],
      version: "version-hills",
      width: 1200,
    },
  ],
  page: 1,
  pageCount: 1,
  total: 2,
  totalBytes: 2_500_000,
} satisfies ImagePageBody;

/** Where the browser asks for the Storage overview. */
export const STORAGE_OVERVIEW_URL = `${LOCAL.URL.TEST_API}${API.PATH.STORAGE_USAGE}/overview`;

/** The Images' bucket, and two Apps' Images by access. */
export const STORAGE_OVERVIEW = {
  avatars: {
    byApp: [
      { app: App.LAURA, bytes: 60_000, count: 1 },
      { app: App.BACK_OFFICE, bytes: 40_000, count: 1 },
    ],
  },
  buckets: [
    {
      id: "image",
      kind: STORAGE_USAGE.BUCKET_KIND.IMAGE,
      reading: {
        asOf: "2026-11-09T10:00:00.000Z",
        bytes: 2_600_000,
        objects: 5,
      },
    },
  ],
  images: {
    byApp: [
      {
        app: App.LAURA,
        privateBytes: 0,
        privateCount: 0,
        publicBytes: 1_500_000,
        publicCount: 1,
      },
      {
        app: App.BACK_OFFICE,
        privateBytes: 1_000_000,
        privateCount: 1,
        publicBytes: 1_500_000,
        publicCount: 1,
      },
    ],
    total: 2,
    totalBytes: 2_500_000,
  },
} satisfies InferResponseType<
  (typeof api)[typeof API.VERSION.CURRENT]["storage"]["overview"]["$get"],
  typeof HTTP.STATUS.OK
>;

/** Where the browser asks for the Users overview. */
export const USER_OVERVIEW_URL = `${LOCAL.URL.TEST_API}${API.PATH.USER_USAGE}/overview`;

/** What the Users overview answers when a test does not set its own. */
export const USER_OVERVIEW = {
  byApp: [
    { admins: 1, app: App.LAURA, count: 3 },
    { admins: 1, app: App.BACK_OFFICE, count: 1 },
  ],
  total: 4,
} satisfies InferResponseType<
  (typeof api)[typeof API.VERSION.CURRENT]["user-usage"]["overview"]["$get"],
  typeof HTTP.STATUS.OK
>;

/** The API's answers when a test does not set its own. */
export const handlers = [
  http.get(`${LOCAL.URL.TEST_API}${API.PATH.HEALTH}`, () =>
    HttpResponse.json(HEALTH_OK)
  ),
  http.get(USERS_URL, () => HttpResponse.json(USERS_PAGE)),
  http.get(IMAGES_URL, () => HttpResponse.json(IMAGES_PAGE)),
  http.get(STORAGE_OVERVIEW_URL, () => HttpResponse.json(STORAGE_OVERVIEW)),
  http.get(USER_OVERVIEW_URL, () => HttpResponse.json(USER_OVERVIEW)),
];
