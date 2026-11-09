// @module-tag integration
import { USER } from "@allonfire/auth/features/users/constants/users";
import { useQueryStates } from "nuqs";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { renderHook } from "vitest-browser-react";
import { usersParams } from "../../constants/users-params";
import { useUsersTableState } from "../use-users-table-state";

const ID = "user-2";

const Address = ({ children }: { children: ReactNode }) => (
  <NuqsTestingAdapter hasMemory>{children}</NuqsTestingAdapter>
);

describe("useUsersTableState", () => {
  it("the selection clears when the search param changes", async () => {
    // The toolbar writes the search through its own nuqs hook.
    const { act, result } = await renderHook(
      () => ({
        address: useQueryStates(usersParams),
        state: useUsersTableState(),
      }),
      { wrapper: Address }
    );
    await act(() => result.current.state.setSelection({ [ID]: true }));
    expect(result.current.state.selection).toEqual({ [ID]: true });
    await act(() =>
      result.current.address[1]({
        [USER.PARAM.SEARCH]: USER.SEARCH.serialize({ text: "isa" }),
      })
    );
    await expect.poll(() => result.current.state.selection).toEqual({});
  });
});
