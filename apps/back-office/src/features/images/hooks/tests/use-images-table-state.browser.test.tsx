// @module-tag integration
import { useQueryStates } from "nuqs";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { renderHook } from "vitest-browser-react";
import { IMAGES } from "../../constants/images";
import { imagesParams } from "../../constants/images-params";
import {
  useImagesTableState,
  useStepBackPastEnd,
} from "../use-images-table-state";

/** The hook on an address showing `page`, told the list has `pageCount` pages. */
const renderAt = (page: number, pageCount: number | undefined) =>
  renderHook(
    () => {
      useStepBackPastEnd(pageCount);
      return {
        address: useQueryStates(imagesParams)[0],
        state: useImagesTableState(),
      };
    },
    {
      wrapper: ({ children }) => (
        <NuqsTestingAdapter
          hasMemory
          searchParams={{ [IMAGES.PARAM.PAGE]: String(page) }}
        >
          {children}
        </NuqsTestingAdapter>
      ),
    }
  );

describe("useStepBackPastEnd", () => {
  it("steps back to the last page that exists when the page is past it", async () => {
    const { result } = await renderAt(3, 2);
    await expect.poll(() => result.current.address[IMAGES.PARAM.PAGE]).toBe(2);
  });

  it("steps back to the first page when no Image is left", async () => {
    const { result } = await renderAt(2, 0);
    await expect
      .poll(() => result.current.address[IMAGES.PARAM.PAGE])
      .toBe(IMAGES.DEFAULT_PAGE);
  });

  it("stays on a page that exists", async () => {
    const { result } = await renderAt(2, 2);
    await expect.poll(() => result.current.state.pagination.pageIndex).toBe(1);
    expect(result.current.address[IMAGES.PARAM.PAGE]).toBe(2);
  });

  it("waits for the list before judging the page", async () => {
    const { result } = await renderAt(3, undefined);
    await expect.poll(() => result.current.state.pagination.pageIndex).toBe(2);
    expect(result.current.address[IMAGES.PARAM.PAGE]).toBe(3);
  });
});
