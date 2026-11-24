// @module-tag integration

import { renderHook } from "vitest-browser-react";
import { aofToast } from "../../../shared/hooks/use-aof-toast";
import { type ListToast, useToastThenList } from "../hooks/use-toast-then-list";

const replace = vi.fn();
vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-navigation", () => ({
  aofBaseNavigation: { useRouter: () => ({ replace }) },
}));
vi.mock("../../../shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<typeof import("../../../shared/hooks/use-aof-toast")>()),
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
