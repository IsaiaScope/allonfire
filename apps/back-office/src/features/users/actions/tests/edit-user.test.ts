// @module-tag unit
import { API } from "@allonfire/api/shared/constants/api";
import { USER } from "@allonfire/auth/features/users/constants/users";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { avatarRemoval } from "@allonfire/ui/lib/avatar-change";
import { updateTag } from "next/cache";
import { USERS } from "../../constants/users";
import { editUser } from "../edit-user";
import { FAKE_API, resetFakeApi } from "./fake-api";

const ID = "user-2";
const STRONG = "A-long-password-1";

vi.mock("@/features/api/utils/server-api", async () => ({
  serverApi: (await import("./fake-api")).fakeServerApi,
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

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

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("editUser", () => {
  it("sends no password when both fields are empty", async () => {
    await editUser(ID, {}, formOf({}));
    expect(patchBody()).toEqual({
      memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
      name: "Edited",
    });
  });

  it("sends a typed password", async () => {
    await editUser(
      ID,
      {},
      formOf({ confirmPassword: STRONG, password: STRONG })
    );
    expect(patchBody()).toMatchObject({ password: STRONG });
  });

  it("sends the locked row's posted Role", async () => {
    await editUser(ID, {}, formOf({}));
    expect(patchBody()).toMatchObject({
      memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
    });
  });

  it("refuses invalid fields without asking the API, keeping no password", async () => {
    const state = await editUser(ID, {}, formOf({ name: " " }));
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
    [
      HTTP.STATUS.INTERNAL_SERVER_ERROR,
      API.ERROR.CODE.INTERNAL_ERROR,
      USERS.EDIT_ERROR.FAILED,
    ],
  ])("maps %i %s to %s, keeping the values", async (status, code, error) => {
    FAKE_API.answers.set(HTTP.METHOD.PATCH, { code, status });
    const state = await editUser(ID, {}, formOf({}));
    expect(state.error).toBe(error);
    expect(state.values?.name).toBe("Edited");
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("on 200 removes the Avatar when posted removed, and answers SAVED after updateTag", async () => {
    const state = await editUser(
      ID,
      {},
      formOf({ [REMOVAL.name]: REMOVAL.value })
    );
    expect(
      FAKE_API.sent.map(({ method, path }) => `${method} ${path}`)
    ).toEqual([
      `${HTTP.METHOD.PATCH} ${API.PATH.USERS}${USER.PATH.ONE.replace(":id", ID)}`,
      `${HTTP.METHOD.DELETE} ${API.PATH.USERS}${USER.PATH.AVATAR.replace(":id", ID)}`,
    ]);
    expect(updateTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(state).toEqual({ notice: USERS.EDIT_NOTICE.SAVED });
  });

  it("says so when the picture's call never reaches the API, the list still dropped", async () => {
    FAKE_API.unreachable.add(HTTP.METHOD.PUT);
    const state = await editUser(
      ID,
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
      {},
      formOf({ [REMOVAL.name]: REMOVAL.value })
    );
    expect(state.error).toBe(USERS.EDIT_ERROR.GONE);
    expect(state.values?.name).toBe("Edited");
  });
});
