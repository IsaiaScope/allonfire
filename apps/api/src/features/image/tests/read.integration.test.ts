// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { prisma } from "@allonfire/database";
import { App } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { API } from "../../../shared/constants/api";
import { cookieFor, ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import { idOf, imageTestApp, listKeys } from "./image-test-app";

const FIXTURE_KEYS = new Set<string>(
  objectValues(FIXTURE.IMAGE).map(({ key }) => key)
);
/** Only the Fixtures: other files upload into the same database meanwhile. */
const fixturesIn = (keys: readonly string[]) =>
  keys.filter((key) => FIXTURE_KEYS.has(key));

let app: TestApp;
beforeEach(() => {
  app = imageTestApp();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("reading Images on the Fixtures", () => {
  it("shows a visitor only public Images", async () => {
    const keys = await listKeys(app);
    expect(keys).toContain(FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE.key);
    // Private in the Back Office, public in Laura.
    expect(keys).toContain(FIXTURE.IMAGE.IN_BOTH_APPS.key);
    expect(keys).not.toContain(FIXTURE.IMAGE.PRIVATE_IN_BACK_OFFICE.key);
    expect(keys).not.toContain(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
  });

  it("shows a Back Office Admin its private Images, not Laura's", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const keys = await listKeys(app, cookie);
    expect(keys).toContain(FIXTURE.IMAGE.PRIVATE_IN_BACK_OFFICE.key);
    expect(keys).toContain(FIXTURE.IMAGE.HEIC_IN_BACK_OFFICE.key);
    expect(keys).not.toContain(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
  });

  it("filters by App and pages by cursor, skipping and repeating nothing", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.ADMIN_EVERYWHERE);
    const all = await listKeys(app, cookie, { app: App.BACK_OFFICE });
    const paged = await listKeys(app, cookie, {
      app: App.BACK_OFFICE,
      limit: 1,
    });
    expect(fixturesIn(paged)).toEqual(fixturesIn(all));
    expect(new Set(paged).size).toBe(paged.length);
    expect(all).not.toContain(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
  });

  it("answers 404 for a private Image to someone who cannot enter its App", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    const res = await app.request(`${API.PATH.IMAGES}/${id}`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
  });
});
