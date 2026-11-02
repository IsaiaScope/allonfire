// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { updateTag } from "next/cache";
import { USERS } from "../../constants/users";
import { deleteUsers } from "../delete-users";
import { FAKE_API, resetFakeApi } from "./fake-api";

const IDS = ["user-2", "user-3"];

vi.mock("@/features/api/utils/server-api", async () => ({
  serverApi: (await import("./fake-api")).fakeServerApi,
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

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

  it("updates no tag when the API refuses", async () => {
    FAKE_API.answers.set(HTTP.METHOD.DELETE, {
      status: HTTP.STATUS.FORBIDDEN,
    });
    expect(await deleteUsers(IDS)).toBeNull();
    expect(updateTag).not.toHaveBeenCalled();
  });
});
