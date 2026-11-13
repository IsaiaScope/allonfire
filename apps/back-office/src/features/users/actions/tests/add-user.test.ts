// @module-tag unit

import { API } from "@allonfire/api/shared/constants/api";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { updateTag } from "next/cache";
import { FAKE_API, resetFakeApi } from "@/features/api/tests/fake-api";
import { redirect } from "@/features/i18n/navigation";
import { STORAGE } from "@/features/storage/constants/storage";
import { USERS } from "../../constants/users";
import { addUser } from "../add-user";

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));
vi.mock("@/features/i18n/navigation", () => ({ redirect: vi.fn() }));

const STRONG = FIXTURE.PASSWORD;

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
  vi.mocked(updateTag).mockClear();
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

  it("asks the new User to verify their email only when the Admin chose so", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status: HTTP.STATUS.CREATED });
    const { verification } = USERS.FORM_FIELDS.VERIFICATION;
    await addUser("en", {}, formOf());
    await addUser(
      "en",
      {},
      formOf({ [verification]: USERS.VERIFICATION.REQUIRED })
    );
    expect(FAKE_API.sent.map(({ body }) => body)).toMatchObject([
      { requireVerification: false },
      { requireVerification: true },
    ]);
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

  it("a picture also drops the Storage numbers: the bucket moved", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status: HTTP.STATUS.CREATED });
    await addUser(
      "en",
      {},
      formOf({
        [USERS.AVATAR_FIELD]: new File(["x"], "a.webp", { type: "image/webp" }),
      })
    );
    expect(updateTag).toHaveBeenCalledWith(STORAGE.CACHE.TAG);
  });

  it("no picture leaves the Storage numbers alone", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status: HTTP.STATUS.CREATED });
    await addUser("en", {}, formOf());
    expect(updateTag).not.toHaveBeenCalledWith(STORAGE.CACHE.TAG);
  });

  it("sends the picture with the new User's Version", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, {
      body: { id: "user-new", version: "version-new" },
      status: HTTP.STATUS.CREATED,
    });
    await addUser(
      "en",
      {},
      formOf({
        [USERS.AVATAR_FIELD]: new File(["x"], "a.webp", { type: "image/webp" }),
      })
    );
    expect(
      FAKE_API.sent.find(({ method }) => method === HTTP.METHOD.PUT)?.body
    ).toEqual({ version: "version-new" });
  });

  it("says so when the picture's call never reaches the API, the list still dropped", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status: HTTP.STATUS.CREATED });
    FAKE_API.unreachable.add(HTTP.METHOD.PUT);
    const state = await addUser(
      "en",
      {},
      formOf({
        [USERS.AVATAR_FIELD]: new File(["x"], "a.webp", { type: "image/webp" }),
      })
    );
    expect(updateTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
    expect(state).toEqual({ notice: USERS.ADD_NOTICE.AVATAR_FAILED });
  });

  it("sends the picture once added, and says so when the API refuses it", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, { status: HTTP.STATUS.CREATED });
    FAKE_API.answers.set(HTTP.METHOD.PUT, {
      status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
    });
    const state = await addUser(
      "en",
      {},
      formOf({
        [USERS.AVATAR_FIELD]: new File(["x"], "a.webp", { type: "image/webp" }),
      })
    );
    expect(FAKE_API.sent.map(({ method }) => method)).toEqual([
      HTTP.METHOD.POST,
      HTTP.METHOD.PUT,
    ]);
    expect(state).toEqual({ notice: USERS.ADD_NOTICE.AVATAR_FAILED });
    expect(redirect).not.toHaveBeenCalled();
  });
});
