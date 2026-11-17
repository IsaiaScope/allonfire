// @module-tag integration

import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { parseAsInteger } from "nuqs";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import { renderHook } from "vitest-browser-react";
import { IMAGES } from "@/features/images/constants/images";
import { codecParser } from "../../utils/list-params";
import { useListView } from "../use-list-view";

const PARSERS = {
  hide: codecParser(IMAGES.HIDE, IMAGES.HISTORY.REPLACE),
  page: parseAsInteger
    .withDefault(IMAGES.DEFAULT_PAGE)
    .withOptions(IMAGES.HISTORY.PUSH),
  sort: codecParser(IMAGE.SORT, IMAGES.HISTORY.REPLACE),
};
const CODECS = { hide: IMAGES.HIDE, sort: IMAGE.SORT };

/** The hook at `address`, with every address write reported to `onUrlUpdate`. */
const renderAt = (address: Record<string, string>) => {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const view = renderHook(
    () =>
      useListView({
        codecs: CODECS,
        hideable: IMAGES.HIDEABLE,
        parsers: PARSERS,
        sortable: IMAGES.SORTABLE,
      }),
    {
      wrapper: ({ children }) => (
        <NuqsTestingAdapter
          hasMemory
          onUrlUpdate={onUrlUpdate}
          searchParams={address}
        >
          {children}
        </NuqsTestingAdapter>
      ),
    }
  );
  return { onUrlUpdate, view };
};
/** What the last write left in the address. */
const lastWrite = (
  onUrlUpdate: ReturnType<typeof vi.fn<OnUrlUpdateFunction>>
) => onUrlUpdate.mock.lastCall?.[0].searchParams;

describe("useListView", () => {
  it("reads the sort and the hidden columns the address holds", async () => {
    const { view } = renderAt({ hide: "apps", sort: "size.desc" });
    const { result } = await view;
    expect(result.current.sorting).toEqual([{ desc: true, id: "size" }]);
    expect(result.current.hidden).toEqual(["apps"]);
    expect(result.current.columnVisibility).toEqual({ apps: false });
  });

  it("writes a sort and sends the list back to the first page, replacing the history entry the page would push", async () => {
    const { onUrlUpdate, view } = renderAt({ page: "3" });
    const { act, result } = await view;
    await act(() =>
      result.current.onSortingChange([{ desc: true, id: "size" }])
    );
    expect(lastWrite(onUrlUpdate)?.get(IMAGES.PARAM.SORT)).toBe("size.desc");
    expect(lastWrite(onUrlUpdate)?.has(IMAGES.PARAM.PAGE)).toBe(false);
    expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe("replace");
  });

  it("writes a change to View alone, the page left as it is", async () => {
    const { onUrlUpdate, view } = renderAt({ page: "3" });
    const { act, result } = await view;
    await act(() => result.current.onHiddenChange(["size"]));
    expect(lastWrite(onUrlUpdate)?.get(IMAGES.PARAM.HIDE)).toBe("size");
    expect(lastWrite(onUrlUpdate)?.get(IMAGES.PARAM.PAGE)).toBe("3");
  });

  it("takes TanStack's visibility updater as a function too", async () => {
    const { onUrlUpdate, view } = renderAt({ hide: "size" });
    const { act, result } = await view;
    await act(() =>
      result.current.onColumnVisibilityChange((old) => ({
        ...old,
        apps: false,
      }))
    );
    expect(lastWrite(onUrlUpdate)?.get(IMAGES.PARAM.HIDE)).toBe("size,apps");
  });

  it("clears the sort, the hidden columns and the page on a reset of a sorted list", async () => {
    const { onUrlUpdate, view } = renderAt({
      hide: "size",
      page: "2",
      sort: "size.asc",
    });
    const { act, result } = await view;
    await act(() => result.current.resetView());
    const search = lastWrite(onUrlUpdate);
    expect(search?.has(IMAGES.PARAM.SORT)).toBe(false);
    expect(search?.has(IMAGES.PARAM.HIDE)).toBe(false);
    expect(search?.has(IMAGES.PARAM.PAGE)).toBe(false);
  });

  it("keeps the page on a reset when only View was set", async () => {
    const { onUrlUpdate, view } = renderAt({ hide: "size", page: "2" });
    const { act, result } = await view;
    await act(() => result.current.resetView());
    const search = lastWrite(onUrlUpdate);
    expect(search?.has(IMAGES.PARAM.HIDE)).toBe(false);
    expect(search?.get(IMAGES.PARAM.PAGE)).toBe("2");
  });
});
