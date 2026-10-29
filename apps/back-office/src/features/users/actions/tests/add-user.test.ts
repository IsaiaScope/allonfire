// @module-tag unit
import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { redirect } from "@/features/i18n/navigation";
import { USERS } from "../../constants/users";
import { addUser } from "../add-user";
import { FAKE_API, resetFakeApi } from "./fake-api";

vi.mock("@/features/api/utils/server-api", async () => ({
  serverApi: (await import("./fake-api")).fakeServerApi,
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/features/i18n/navigation", () => ({ redirect: vi.fn() }));

const STRONG = "A-long-password-1";

const formOf = (fields: Record<string, string | File> = {}) => {
  const form = new FormData();
  for (const [key, value] of objectEntries({
    confirmPassword: STRONG,
    email: "new@add-user.test",
    name: "New",
    password: STRONG,
    [`roles.${App.BACK_OFFICE}`]: USERS.NO_ROLE,
    [`roles.${App.LAURA}`]: Role.USER,
    ...fields,
  })) {
    form.append(key, value);
  }
  return form;
};

beforeEach(() => {
  resetFakeApi();
  vi.mocked(redirect).mockClear();
});

describe("addUser", () => {
  it.each([
    [HTTP.STATUS.CONFLICT, API.ERROR.CODE.EMAIL_TAKEN, USERS.ADD_ERROR.TAKEN],
    // A Session ended or a Role taken away: signing in again might help.
    [HTTP.STATUS.FORBIDDEN, API.ERROR.CODE.FORBIDDEN, USERS.ADD_ERROR.REFUSED],
    [
      HTTP.STATUS.UNAUTHORIZED,
      API.ERROR.CODE.UNAUTHORIZED,
      USERS.ADD_ERROR.REFUSED,
    ],
    [
      HTTP.STATUS.INTERNAL_SERVER_ERROR,
      API.ERROR.CODE.INTERNAL_ERROR,
      USERS.ADD_ERROR.FAILED,
    ],
    // A code no form knows is just a failure, whatever its name.
    [HTTP.STATUS.INTERNAL_SERVER_ERROR, "constructor", USERS.ADD_ERROR.FAILED],
  ])("maps %i %s to %s, keeping the values", async (status, code, error) => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { code, status });
    const state = await addUser("en", {}, formOf());
    expect(state.error).toBe(error);
    expect(state.values?.email).toBe("new@add-user.test");
  });

  it("refuses invalid fields without asking the API", async () => {
    const state = await addUser("en", {}, formOf({ name: " " }));
    expect(state.error).toBe(USERS.ADD_ERROR.INVALID);
    expect(FAKE_API.sent).toEqual([]);
  });

  it("adds the User and opens the list when no picture was posted", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status: HTTP.STATUS.CREATED });
    await addUser("en", {}, formOf());
    expect(FAKE_API.sent.map(({ method }) => method)).toEqual([
      HTTP.METHOD.POST,
    ]);
    expect(redirect).toHaveBeenCalledOnce();
  });

  it("sends the picture once added, and says so when the API refuses it", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status: HTTP.STATUS.CREATED });
    FAKE_API.answers.set(HTTP.METHOD.PUT, {
      status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
    });
    const state = await addUser(
      "en",
      {},
      formOf({ avatar: new File(["x"], "a.webp", { type: "image/webp" }) })
    );
    expect(FAKE_API.sent.map(({ method }) => method)).toEqual([
      HTTP.METHOD.POST,
      HTTP.METHOD.PUT,
    ]);
    expect(state).toEqual({ notice: USERS.ADD_NOTICE.AVATAR_FAILED });
    expect(redirect).not.toHaveBeenCalled();
  });
});
