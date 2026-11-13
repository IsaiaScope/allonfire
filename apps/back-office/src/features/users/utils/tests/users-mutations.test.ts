// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import { QUERY } from "@/shared/constants/query";
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
