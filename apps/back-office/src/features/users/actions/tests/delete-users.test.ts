// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { FAKE_API, resetFakeApi } from "@/features/api/tests/fake-api";
import { STORAGE } from "@/features/storage/constants/storage";
import { USERS } from "../../constants/users";
import { deleteUsers } from "../delete-users";

const IDS = ["user-2", "user-3"];

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));

beforeEach(() => {
  resetFakeApi();
  vi.mocked(updateTag).mockClear();
});

describe("deleteUsers", () => {
  it("on 200 updates the Users tag, the list's and each User's page", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, { status: HTTP.STATUS.OK });
    await deleteUsers(IDS);
    expect(updateTag).toHaveBeenCalledWith(USERS.CACHE.TAG);
  });

  it("on 200 also updates the Storage tag: their Avatars went with them", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, { status: HTTP.STATUS.OK });
    await deleteUsers(IDS);
    expect(updateTag).toHaveBeenCalledWith(STORAGE.CACHE.TAG);
  });

  it("updates no tag when the API refuses", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, {
      status: HTTP.STATUS.FORBIDDEN,
    });
    expect(await deleteUsers(IDS)).toBeNull();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
