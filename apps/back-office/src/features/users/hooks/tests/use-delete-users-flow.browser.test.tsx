// @module-tag integration
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderHook } from "vitest-browser-react";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { deleteUsers } from "../../actions/delete-users";
import { useDeleteUsersFlow } from "../use-delete-users-flow";

// A server action: covered for real by e2e.
vi.mock("../../actions/delete-users", () => ({ deleteUsers: vi.fn() }));
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const IDS = ["user-2", "user-3"];

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <NextIntlClientProvider locale="en" messages={EN}>
      {children}
    </NextIntlClientProvider>
  </QueryClientProvider>
);

describe("useDeleteUsersFlow", () => {
  it("a confirmed delete calls deleteUsers with the selected ids, toasts, and clears the selection", async () => {
    vi.mocked(deleteUsers).mockResolvedValue(IDS.length);
    const onClear = vi.fn();
    const { act, result } = await renderHook(
      () => useDeleteUsersFlow(IDS, onClear),
      { wrapper: Providers }
    );
    await act(() => result.current.ask());
    expect(result.current.asking).toBe(true);
    await act(() => result.current.confirm());
    expect(result.current.asking).toBe(false);
    expect(deleteUsers).toHaveBeenCalledWith(IDS);
    await expect
      .poll(() => vi.mocked(aofToast).mock.calls[0])
      .toEqual([enT("Users.delete.done", { count: IDS.length }), "success"]);
    expect(onClear).toHaveBeenCalledOnce();
  });
});
