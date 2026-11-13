// @module-tag integration
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderHook } from "vitest-browser-react";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { deleteImages } from "../../actions/delete-images";
import { useDeleteImagesFlow } from "../use-delete-images-flow";

// A server action: covered for real by e2e.
vi.mock("../../actions/delete-images", () => ({ deleteImages: vi.fn() }));
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const IDS = ["image-1", "image-2"];

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <NextIntlClientProvider locale="en" messages={EN}>
      {children}
    </NextIntlClientProvider>
  </QueryClientProvider>
);

/** Confirms a deletion of IDS that the API answers with `deleted`. */
const deleteAnswering = async (deleted: number) => {
  vi.mocked(deleteImages).mockResolvedValue(deleted);
  vi.mocked(aofToast).mockClear();
  const onClear = vi.fn();
  const { act, result } = await renderHook(
    () => useDeleteImagesFlow(IDS, onClear),
    { wrapper: Providers }
  );
  await act(() => result.current.ask());
  await act(() => result.current.confirm());
  return onClear;
};

const toasted = () => vi.mocked(aofToast).mock.calls[0];

describe("useDeleteImagesFlow", () => {
  it("a confirmed delete toasts how many went and clears the selection", async () => {
    const onClear = await deleteAnswering(IDS.length);
    expect(deleteImages).toHaveBeenCalledWith(IDS);
    await expect
      .poll(toasted)
      .toEqual([enT("Images.delete.done", { count: IDS.length }), "success"]);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("says so when every Image was deleted already", async () => {
    const onClear = await deleteAnswering(0);
    await expect
      .poll(toasted)
      .toEqual([enT("Images.delete.gone", { count: IDS.length }), "success"]);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("tells how many went and how many were gone when only some were", async () => {
    await deleteAnswering(1);
    await expect
      .poll(toasted)
      .toEqual([
        enT("Images.delete.partly", { deleted: 1, gone: 1 }),
        "success",
      ]);
  });
});
