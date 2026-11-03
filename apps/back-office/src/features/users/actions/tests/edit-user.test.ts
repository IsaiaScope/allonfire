// @module-tag unit

import { API } from "@allonfire/api/shared/constants/api";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App, Role } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { avatarRemoval } from "@allonfire/ui/lib/avatar-change";
import { updateTag } from "next/cache";
import { USERS } from "../../constants/users";
import { editUser } from "../edit-user";
import { FAKE_API, resetFakeApi } from "./fake-api";

const ID = "user-2";
/** The Version the form was opened with. */
const VERSION = "version-1";
/** The Version the PATCH answers: the User as just saved. */
const SAVED_VERSION = "version-2";
const STRONG = FIXTURE.PASSWORD;

vi.mock("@/features/api/utils/server-api", async () => ({
  serverApi: (await import("./fake-api")).fakeServerApi,
}));
vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));

/** The removal the picture field posts. */
const REMOVAL = avatarRemoval(USERS.AVATAR_FIELD);

const formOf = (fields: Record<string, string | File>) => {
  const form = new FormData();
  for (const [key, value] of objectEntries({
    confirmPassword: "",
    name: "Edited",
    password: "",
    [`roles.${App.BACK_OFFICE}`]: Role.ADMIN,
    [`roles.${App.LAURA}`]: USERS.NO_ROLE,
    ...fields,
  })) {
    form.append(key, value);
  }
  return form;
};
const patchBody = () =>
  FAKE_API.sent.find(({ method }) => method === HTTP.METHOD.PATCH)?.body;
/** What the request for `method` sent. */
const sentBody = (method: string) =>
  FAKE_API.sent.find((sent) => sent.method === method)?.body;
/** The PATCH answering the User as saved, on their new Version. */
const savedOn = (version: string) =>
  FAKE_API.answers.set(HTTP.METHOD.PATCH, {
    body: { version },
    status: HTTP.STATUS.OK,
  });
const PICTURE = () => new File(["x"], "a.webp", { type: "image/webp" });

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("editUser", () => {
  it("sends no password when both fields are empty", async () => {
    await editUser(ID, VERSION, {}, formOf({}));
    expect(patchBody()).toEqual({
      memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
      name: "Edited",
      version: VERSION,
    });
  });

  it("sends a typed password", async () => {
    await editUser(
      ID,
      VERSION,
      {},
      formOf({ confirmPassword: STRONG, password: STRONG })
    );
    expect(patchBody()).toMatchObject({ password: STRONG });
  });

  it("sends the locked row's posted Role", async () => {
    await editUser(ID, VERSION, {}, formOf({}));
    expect(patchBody()).toMatchObject({
      memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
    });
  });

  it("refuses invalid fields without asking the API, keeping no password", async () => {
    const state = await editUser(ID, VERSION, {}, formOf({ name: " " }));
    expect(state.error).toBe(USERS.EDIT_ERROR.INVALID);
    expect(state.values?.name).toBe(" ");
    expect(FAKE_API.sent).toEqual([]);
  });

  it.each([
    [
      HTTP.STATUS.FORBIDDEN,
      USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE,
      USERS.EDIT_ERROR.OWN_ROLE,
    ],
    // A Session ended (a new password) or a Role taken away: trying again
    // never works, signing in again might.
    [HTTP.STATUS.FORBIDDEN, API.ERROR.CODE.FORBIDDEN, USERS.EDIT_ERROR.REFUSED],
    [
      HTTP.STATUS.UNAUTHORIZED,
      API.ERROR.CODE.UNAUTHORIZED,
      USERS.EDIT_ERROR.REFUSED,
    ],
    [HTTP.STATUS.NOT_FOUND, API.ERROR.CODE.NOT_FOUND, USERS.EDIT_ERROR.GONE],
    // Changed by someone else since the form was opened.
    [
      HTTP.STATUS.CONFLICT,
      API.ERROR.CODE.RESOURCE_CHANGED,
      USERS.EDIT_ERROR.CHANGED,
    ],
    [
      HTTP.STATUS.INTERNAL_SERVER_ERROR,
      API.ERROR.CODE.INTERNAL_ERROR,
      USERS.EDIT_ERROR.FAILED,
    ],
  ])("maps %i %s to %s, keeping the values", async (status, code, error) => {
    FAKE_API.answers.set(HTTP.METHOD.PATCH, { code, status });
    const state = await editUser(ID, VERSION, {}, formOf({}));
    expect(state.error).toBe(error);
    expect(state.values?.name).toBe("Edited");
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("editUser, once saved", () => {
  it.each([
    [
      "new picture",
      HTTP.METHOD.PUT,
      () => ({ [USERS.AVATAR_FIELD]: PICTURE() }),
    ],
    ["removal", HTTP.METHOD.DELETE, () => ({ [REMOVAL.name]: REMOVAL.value })],
  ])(
    "the Avatar change (%s) is sent with the Version the PATCH answered",
    async (_, method, fields) => {
      savedOn(SAVED_VERSION);
      await editUser(ID, VERSION, {}, formOf(fields()));
      expect(sentBody(method)).toEqual({ version: SAVED_VERSION });
    }
  );

  it("a 409 on the Avatar change answers CHANGED, keeping the values, the list dropped", async () => {
    savedOn(SAVED_VERSION);
    FAKE_API.answers.set(HTTP.METHOD.PUT, {
      code: API.ERROR.CODE.RESOURCE_CHANGED,
      status: HTTP.STATUS.CONFLICT,
    });
    const state = await editUser(
      ID,
      VERSION,
      {},
      formOf({ [USERS.AVATAR_FIELD]: PICTURE() })
    );
    expect(state.error).toBe(USERS.EDIT_ERROR.CHANGED);
    expect(state.values?.name).toBe("Edited");
    expect(updateTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
  });

  it("on 200 removes the Avatar when posted removed, and answers SAVED after updateTag", async () => {
    const state = await editUser(
      ID,
      VERSION,
      {},
      formOf({ [REMOVAL.name]: REMOVAL.value })
    );
    expect(
      FAKE_API.sent.map(({ method, path }) => `${method} ${path}`)
    ).toEqual([
      `${HTTP.METHOD.PATCH} ${API.PATH.USERS}${fillPath(USER.PATH.ONE, { id: ID })}`,
      `${HTTP.METHOD.DELETE} ${API.PATH.USERS}${fillPath(USER.PATH.AVATAR, { id: ID })}`,
    ]);
    expect(updateTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(state).toEqual({ notice: USERS.EDIT_NOTICE.SAVED });
  });

  it("says so when the picture's call never reaches the API, the list still dropped", async () => {
    FAKE_API.unreachable.add(HTTP.METHOD.PUT);
    const state = await editUser(
      ID,
      VERSION,
      {},
      formOf({
        [USERS.AVATAR_FIELD]: new File(["x"], "a.webp", { type: "image/webp" }),
      })
    );
    expect(updateTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(state).toEqual({ notice: USERS.EDIT_NOTICE.AVATAR_FAILED });
  });

  it("sends a new picture, and says so when the API refuses it", async () => {
    FAKE_API.answers.set(HTTP.METHOD.PUT, {
      status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
    });
    const state = await editUser(
      ID,
      VERSION,
      {},
      formOf({
        [USERS.AVATAR_FIELD]: new File(["x"], "a.webp", { type: "image/webp" }),
        [REMOVAL.name]: REMOVAL.value,
      })
    );
    expect(FAKE_API.sent.map(({ method }) => method)).toEqual([
      HTTP.METHOD.PATCH,
      HTTP.METHOD.PUT,
    ]);
    expect(state).toEqual({ notice: USERS.EDIT_NOTICE.AVATAR_FAILED });
  });

  it("says the User is gone when they were deleted before their picture was sent", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, {
      code: API.ERROR.CODE.NOT_FOUND,
      status: HTTP.STATUS.NOT_FOUND,
    });
    const state = await editUser(
      ID,
      VERSION,
      {},
      formOf({ [REMOVAL.name]: REMOVAL.value })
    );
    expect(state.error).toBe(USERS.EDIT_ERROR.GONE);
    expect(state.values?.name).toBe("Edited");
  });
});
