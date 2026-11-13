// @module-tag integration
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { renderHook } from "vitest-browser-react";
import { type ListToast, useToastThenList } from "../use-toast-then-list";

const replace = vi.fn();
vi.mock("@/features/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
}));
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const LIST = "/somewhere";
type Notice = "other" | "saved";
const TOASTS: Partial<Record<Notice, ListToast>> = {
  saved: { kind: "success", message: "Saved" },
};

describe("useToastThenList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("a listed notice toasts, refreshes what the feature names, then opens the list", async () => {
    const refresh = vi.fn(() => Promise.resolve());
    await renderHook(() => useToastThenList(LIST, "saved", TOASTS, refresh));
    await expect.poll(() => replace.mock.calls[0]).toEqual([LIST]);
    expect(aofToast).toHaveBeenCalledWith("Saved", "success");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("no refresh is needed to open the list", async () => {
    await renderHook(() => useToastThenList(LIST, "saved", TOASTS));
    await expect.poll(() => replace.mock.calls[0]).toEqual([LIST]);
  });

  it("a notice it does not list, or none, leaves the form where it is", async () => {
    const refresh = vi.fn(() => Promise.resolve());
    await renderHook(() => {
      useToastThenList(LIST, "other", TOASTS, refresh);
      useToastThenList(LIST, undefined, TOASTS, refresh);
    });
    expect(aofToast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
