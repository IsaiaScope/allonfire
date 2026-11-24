// @module-tag integration
import { renderHook } from "vitest-browser-react";
import { useStepBackPastEnd } from "../hooks/use-step-back-past-end";

type Answer = { pageCount: number; total: number };

/** The hook on `page`, asked of a list that answered `data` (`undefined`: not yet) holding `rows` rows. */
const renderAt = async ({
  data,
  isPlaceholderData = false,
  page,
  rows,
  status = "success",
}: {
  data: Answer | undefined;
  isPlaceholderData?: boolean;
  page: number;
  rows?: number;
  status?: "error" | "pending" | "success";
}) => {
  const stepTo = vi.fn<(last: number) => void>();
  const hook = await renderHook(() =>
    useStepBackPastEnd({
      firstPage: 1,
      page,
      query: { data, isPlaceholderData, status },
      rows,
      stepTo,
    })
  );
  return { hook, stepTo };
};

describe("useStepBackPastEnd", () => {
  it("steps back to the last page that exists when the page is past it", async () => {
    const { stepTo } = await renderAt({
      data: { pageCount: 2, total: 30 },
      page: 3,
      rows: 0,
    });
    await expect.poll(() => stepTo.mock.calls).toEqual([[2]]);
  });

  it("steps back to the first page when nothing is left", async () => {
    const { stepTo } = await renderAt({
      data: { pageCount: 0, total: 0 },
      page: 2,
      rows: 0,
    });
    await expect.poll(() => stepTo.mock.calls).toEqual([[1]]);
  });

  it("stays on a page that exists", async () => {
    const { stepTo } = await renderAt({
      data: { pageCount: 2, total: 30 },
      page: 2,
      rows: 5,
    });
    await expect.poll(() => stepTo.mock.calls).toEqual([]);
  });

  it("waits for the list before judging the page: kept rows judge nothing", async () => {
    const { stepTo } = await renderAt({ data: undefined, page: 3 });
    const kept = await renderAt({
      data: { pageCount: 1, total: 5 },
      isPlaceholderData: true,
      page: 3,
      rows: 5,
    });
    await expect.poll(() => stepTo.mock.calls).toEqual([]);
    expect(kept.stepTo.mock.calls).toEqual([]);
  });

  it("answers pending, never empty, while a page with no rows but Users or Images elsewhere steps back", async () => {
    const { hook } = await renderAt({
      data: { pageCount: 1, total: 5 },
      page: 2,
      rows: 0,
    });
    await expect.poll(() => hook.result.current).toBe("pending");
  });

  it("hands the query's own status on otherwise, empty lists and failures included", async () => {
    const empty = await renderAt({
      data: { pageCount: 0, total: 0 },
      page: 1,
      rows: 0,
    });
    const failed = await renderAt({
      data: undefined,
      page: 1,
      status: "error",
    });
    await expect.poll(() => empty.hook.result.current).toBe("success");
    await expect.poll(() => failed.hook.result.current).toBe("error");
  });
});
