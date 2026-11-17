// @module-tag integration
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { renderHook } from "vitest-browser-react";
import { IMAGES } from "../../constants/images";
import { useImagesTableState } from "../use-images-table-state";

/** The state on an address showing `page`, every address update handed to `updates`. */
const renderAt = (page: number, updates: UrlUpdateEvent[]) => {
  const record = (event: UrlUpdateEvent) => updates.push(event);
  return renderHook(() => useImagesTableState(), {
    wrapper: ({ children }) => (
      <NuqsTestingAdapter
        hasMemory
        onUrlUpdate={record}
        searchParams={{ [IMAGES.PARAM.PAGE]: String(page) }}
      >
        {children}
      </NuqsTestingAdapter>
    ),
  });
};

describe("useImagesTableState", () => {
  it("reads the page from the address", async () => {
    const { result } = await renderAt(3, []);
    await expect.poll(() => result.current.pagination.pageIndex).toBe(2);
  });

  it("steps back to a page in place: the address changes, its history entry is replaced", async () => {
    const updates: UrlUpdateEvent[] = [];
    const { result } = await renderAt(5, updates);
    result.current.stepBackTo(2);
    await expect.poll(() => result.current.pagination.pageIndex).toBe(1);
    expect(updates.at(-1)?.options.history).toBe("replace");
  });
});
