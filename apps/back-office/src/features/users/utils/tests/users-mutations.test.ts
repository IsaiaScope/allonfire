// @module-tag unit
import { USER } from "@allonfire/auth/features/users/constants/users";
import { QueryClient } from "@tanstack/react-query";
import { QUERY } from "@/shared/constants/query";
import { USERS_PAGE } from "@/shared/tests/msw/handlers";
import { deleteUsers } from "../../actions/delete-users";
import { deleteUsersMutation } from "../users-mutations";

vi.mock("../../actions/delete-users", () => ({
  deleteUsers: vi.fn(() => Promise.resolve(1)),
}));

describe("deleteUsersMutation", () => {
  it("refreshes the Users and the Storage overview this browser holds", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await deleteUsersMutation.onSettled?.(
      { deleted: 1 },
      null,
      ["user-2"],
      undefined,
      { client, meta: undefined }
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY.USERS.ALL });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY.STORAGE.ALL });
  });
});

describe("deleteUsersMutation, before the API answers", () => {
  const PARAMS = { [USER.PARAM.PER_PAGE]: 10 };
  const MORE = { ...USERS_PAGE, pageCount: 2, total: 12 };
  const NAMED = USERS_PAGE.users[0]?.id ?? "";
  const run = (queryClient: QueryClient) =>
    queryClient
      .getMutationCache()
      .build(queryClient, deleteUsersMutation)
      .execute([NAMED]);

  it("takes the named rows out of the cached pages", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(QUERY.USERS.PAGE(PARAMS), MORE);
    await run(queryClient);
    expect(
      queryClient.getQueryData<typeof MORE>(QUERY.USERS.PAGE(PARAMS))?.total
    ).toBe(11);
  });

  it("puts them back when the API refuses", async () => {
    vi.mocked(deleteUsers).mockResolvedValueOnce(null);
    const queryClient = new QueryClient();
    queryClient.setQueryData(QUERY.USERS.PAGE(PARAMS), MORE);
    await run(queryClient).catch(() => undefined);
    expect(queryClient.getQueryData(QUERY.USERS.PAGE(PARAMS))).toEqual(MORE);
  });
});
