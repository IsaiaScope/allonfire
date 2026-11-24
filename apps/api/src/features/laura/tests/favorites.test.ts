// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App, Role } from "@allonfire/database/enums";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { LAURA } from "../constants/laura";
import type { LauraDeps } from "../utils/deps";
import { stubLauraDeps } from "./stub-laura-deps";

const IMAGE_ID = "image-1";
const LAURA_ADMIN = { memberships: [{ app: App.LAURA, role: Role.ADMIN }] };
const LAURA_USER = { memberships: [{ app: App.LAURA, role: Role.USER }] };
const BACK_OFFICE_ADMIN = {
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
};

const urlOf = (imageId = IMAGE_ID) =>
  `${API.PATH.LAURA.FAVORITES}${fillPath(LAURA.FAVORITES.PATH.ONE, { imageId })}`;

const appWith = (
  overrides: Partial<LauraDeps>,
  session: ReturnType<typeof sessionFor> | null
) =>
  createApp(
    appDeps({
      auth: apiAuth({ getSession: () => Promise.resolve(session) }),
      laura: stubLauraDeps(overrides),
    })
  );

const put = (app: ReturnType<typeof appWith>, imageId?: string) =>
  app.request(urlOf(imageId), { method: HTTP.METHOD.PUT });
const del = (app: ReturnType<typeof appWith>, imageId?: string) =>
  app.request(urlOf(imageId), { method: HTTP.METHOD.DELETE });

describe("PUT /laura/favorites/:imageId", () => {
  const admin = sessionFor(LAURA_ADMIN);

  it("marks the Image with just its id, answering 200 each time", async () => {
    const markFavorite = vi.fn(() => Promise.resolve(true));
    const app = appWith(
      { canManage: () => Promise.resolve(true), markFavorite },
      admin
    );
    const first = await put(app);
    const second = await put(app);
    expect([first.status, second.status]).toEqual([
      HTTP.STATUS.OK,
      HTTP.STATUS.OK,
    ]);
    expect(await Promise.all([first.json(), second.json()])).toEqual([
      { favorite: true, imageId: IMAGE_ID },
      { favorite: true, imageId: IMAGE_ID },
    ]);
    expect(markFavorite).toHaveBeenCalledTimes(2);
    expect(markFavorite).toHaveBeenCalledWith(IMAGE_ID);
  });

  it("answers 404 when the Image is not in Laura, as the dep says", async () => {
    const res = await put(
      appWith(
        {
          canManage: () => Promise.resolve(true),
          markFavorite: () => Promise.resolve(false),
        },
        admin
      )
    );
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.NOT_FOUND);
  });

  it("reads the Admin fresh, with the Session and User ids", async () => {
    const canManage = vi.fn(() => Promise.resolve(true));
    await put(appWith({ canManage }, admin));
    expect(canManage).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      userId: expect.any(String),
    });
  });
});

describe("DELETE /laura/favorites/:imageId", () => {
  const admin = sessionFor(LAURA_ADMIN);

  it.each(["a known id", "an unknown id"])(
    "answers 200 favorite false for %s and clears by id",
    async (_name) => {
      const unmarkFavorite = vi.fn(() => Promise.resolve());
      const res = await del(
        appWith(
          { canManage: () => Promise.resolve(true), unmarkFavorite },
          admin
        )
      );
      expect(res.status).toBe(HTTP.STATUS.OK);
      expect(await res.json()).toEqual({ favorite: false, imageId: IMAGE_ID });
      expect(unmarkFavorite).toHaveBeenCalledWith(IMAGE_ID);
    }
  );
});

describe.each([
  ["PUT", put],
  ["DELETE", del],
])("%s /laura/favorites/:imageId: who may write", (_method, send) => {
  const writes = () => ({
    canManage: vi.fn(() => Promise.resolve(true)),
    markFavorite: vi.fn(() => Promise.resolve(true)),
    unmarkFavorite: vi.fn(() => Promise.resolve()),
  });

  it("answers 401 without a Session", async () => {
    const deps = writes();
    const res = await send(appWith(deps, null));
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(deps.markFavorite).not.toHaveBeenCalled();
    expect(deps.unmarkFavorite).not.toHaveBeenCalled();
  });

  it.each([
    ["a Laura User", LAURA_USER],
    ["a Back Office Admin who is no Laura Member", BACK_OFFICE_ADMIN],
  ])("answers 403 to %s before any read or write", async (_name, user) => {
    const deps = writes();
    const res = await send(appWith(deps, sessionFor(user)));
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(deps.canManage).not.toHaveBeenCalled();
    expect(deps.markFavorite).not.toHaveBeenCalled();
    expect(deps.unmarkFavorite).not.toHaveBeenCalled();
  });

  it("answers 403 to an Admin whose Session or role is gone now, and writes nothing", async () => {
    const deps = {
      ...writes(),
      canManage: vi.fn(() => Promise.resolve(false)),
    };
    const res = await send(appWith(deps, sessionFor(LAURA_ADMIN)));
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(deps.markFavorite).not.toHaveBeenCalled();
    expect(deps.unmarkFavorite).not.toHaveBeenCalled();
  });
});
